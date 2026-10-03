import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripeGet } from "@/lib/stripe/client";
import { PAGE_SIZE, monthlyRevenueMinor, type OrgListQuery } from "@/lib/admin/schema";

const DAY = 86_400_000;

// ------------------------------------------------------------------------------------------------ preço
interface StripePrice {
  unit_amount: number | null;
  currency: string;
  recurring?: { interval: string; interval_count: number } | null;
}
let priceCache: { at: number; value: StripePrice | null } | null = null;

// O preço do plano, lido do Stripe (a fonte da verdade). Em cache 10 min; se o Stripe falhar, "indisponível".
export async function getPlanPrice(): Promise<StripePrice | null> {
  if (priceCache && Date.now() - priceCache.at < 10 * 60_000) return priceCache.value;
  let value: StripePrice | null = null;
  try {
    const id = process.env.STRIPE_PRICE_ID?.trim();
    if (id) value = await stripeGet<StripePrice>(`/prices/${encodeURIComponent(id)}`);
  } catch {
    value = null;
  }
  priceCache = { at: Date.now(), value };
  return value;
}

// ------------------------------------------------------------------------------------------- visão global
export async function loadOverview() {
  const since24h = new Date(Date.now() - DAY);
  const [orgs, byStatus, blocked, users, contacts, out24, in24, outboxByStatus, oldestPending, failed24, campaigns, automations, popups, integrations, deletions, activeSubs, price] = await Promise.all([
    prisma.workspace.count(),
    prisma.workspace.groupBy({ by: ["subStatus"], _count: { _all: true } }),
    prisma.workspace.count({ where: { blockedAt: { not: null } } }),
    prisma.user.count(),
    prisma.contact.count(),
    prisma.message.count({ where: { direction: "OUT", createdAt: { gte: since24h } } }),
    prisma.message.count({ where: { direction: "IN", createdAt: { gte: since24h } } }),
    prisma.outboxMessage.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.outboxMessage.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.outboxMessage.count({ where: { status: "FAILED", updatedAt: { gte: since24h } } }),
    prisma.campaign.groupBy({ by: ["status"], where: { status: { in: ["SCHEDULED", "SENDING"] } }, _count: { _all: true } }),
    prisma.automation.count({ where: { active: true } }),
    prisma.popup.count({ where: { active: true } }),
    prisma.socialIntegration.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.dataDeletionRequest.count({ where: { status: "received" } }),
    prisma.workspace.count({ where: { subStatus: "active", stripeSubscriptionId: { not: null }, blockedAt: null } }),
    getPlanPrice(),
  ]);
  const statusCount = (status: string) => byStatus.find((row) => row.subStatus === status)?._count._all ?? 0;
  const outbox = (status: string) => outboxByStatus.find((row) => row.status === status)?._count._all ?? 0;
  const mrr = price?.unit_amount != null && price.recurring ? { amountMinor: monthlyRevenueMinor(activeSubs, price.unit_amount, price.recurring.interval, price.recurring.interval_count), currency: price.currency.toUpperCase() } : null;

  return {
    orgs,
    blocked,
    byStatus: { active: statusCount("active"), trialing: statusCount("trialing"), past_due: statusCount("past_due"), canceled: statusCount("canceled") },
    users,
    contacts,
    messages24h: { out: out24, in: in24 },
    activeSubs,
    mrr,
    outbox: { pending: outbox("PENDING"), processing: outbox("PROCESSING"), failed24h: failed24, oldestPendingMinutes: oldestPending ? Math.round((Date.now() - oldestPending.createdAt.getTime()) / 60_000) : 0 },
    campaigns: { scheduled: campaigns.find((row) => row.status === "SCHEDULED")?._count._all ?? 0, sending: campaigns.find((row) => row.status === "SENDING")?._count._all ?? 0 },
    automations,
    popups,
    integrations: { active: integrations.find((row) => row.status === "ACTIVE")?._count._all ?? 0, problem: integrations.filter((row) => row.status !== "ACTIVE").reduce((sum, row) => sum + row._count._all, 0) },
    pendingDeletions: deletions,
  };
}

// Só se diz se está configurado, nunca o valor.
export function configChecks(): { label: string; ok: boolean }[] {
  const set = (name: string) => Boolean(process.env[name]?.trim());
  return [
    { label: "Stripe (chave secreta e plano)", ok: set("STRIPE_SECRET_KEY") && set("STRIPE_PRICE_ID") },
    { label: "Webhook de faturação do Stripe", ok: set("STRIPE_WEBHOOK_SECRET") },
    { label: "Stripe Connect (cliente e webhook)", ok: set("STRIPE_CONNECT_CLIENT_ID") && set("STRIPE_CONNECT_WEBHOOK_SECRET") },
    { label: "Meta (segredo da app)", ok: set("META_APP_SECRET") },
    { label: "Crons (CRON_SECRET)", ok: set("CRON_SECRET") },
    { label: "E-mail (Resend)", ok: set("RESEND_API_KEY") && set("EMAIL_FROM") },
    { label: "IA (OpenRouter)", ok: set("OPENROUTER_API_KEY") },
    { label: "Endereço público (NEXT_PUBLIC_APP_URL)", ok: set("NEXT_PUBLIC_APP_URL") },
  ];
}

// -------------------------------------------------------------------------------------- organizações
export async function listOrganizations(query: OrgListQuery) {
  const where: Prisma.WorkspaceWhereInput = {
    ...(query.status === "blocked" ? { blockedAt: { not: null } } : query.status !== "all" ? { subStatus: query.status } : {}),
    ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { ownerEmail: { contains: query.q, mode: "insensitive" } }, { id: query.q }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.workspace.count({ where }),
    prisma.workspace.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: { id: true, name: true, ownerEmail: true, createdAt: true, subStatus: true, plan: true, trialEndsAt: true, blockedAt: true, stripeSubscriptionId: true } }),
  ]);
  const ids = rows.map((row) => row.id);
  const since30 = new Date(Date.now() - 30 * DAY);
  const [users, contacts, messages] = ids.length
    ? await Promise.all([
        prisma.user.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids } }, _count: { _all: true } }),
        prisma.contact.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids } }, _count: { _all: true } }),
        prisma.message.groupBy({ by: ["workspaceId"], where: { workspaceId: { in: ids }, direction: "OUT", createdAt: { gte: since30 } }, _count: { _all: true } }),
      ])
    : [[], [], []];
  const n = (list: { workspaceId: string; _count: { _all: number } }[], id: string) => list.find((row) => row.workspaceId === id)?._count._all ?? 0;
  return {
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: rows.map((row) => ({ ...row, users: n(users, row.id), contacts: n(contacts, row.id), messages30d: n(messages, row.id) })),
  };
}

export async function loadOrganization(id: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, name: true, ownerEmail: true, createdAt: true, subStatus: true, plan: true, trialEndsAt: true, blockedAt: true, blockedReason: true, stripeCustomerId: true, stripeSubscriptionId: true, stripeConnectAccountId: true, stripeEventAt: true, agentEnabled: true },
  });
  if (!workspace) return null;
  const since7 = new Date(Date.now() - 7 * DAY);
  const since30 = new Date(Date.now() - 30 * DAY);
  const [members, contactCount, contactsSample, campaigns, automations, popups, integrations, apiKeys, out7, out30, in30, outbox, payments, audit] = await Promise.all([
    prisma.user.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, name: true, role: true, createdAt: true } }),
    prisma.contact.count({ where: { workspaceId: id } }),
    prisma.contact.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, waId: true, leadStage: true, platform: true, createdAt: true } }),
    prisma.campaign.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, status: true, totalRecipients: true, scheduledAt: true } }),
    prisma.automation.groupBy({ by: ["active"], where: { workspaceId: id }, _count: { _all: true } }),
    prisma.popup.groupBy({ by: ["active"], where: { workspaceId: id }, _count: { _all: true } }),
    prisma.socialIntegration.findMany({ where: { workspaceId: id }, select: { platform: true, status: true, tokenExpiresAt: true } }),
    prisma.apiKey.findMany({ where: { workspaceId: id }, select: { id: true, name: true, role: true, lastUsedAt: true, revokedAt: true } }),
    prisma.message.count({ where: { workspaceId: id, direction: "OUT", createdAt: { gte: since7 } } }),
    prisma.message.count({ where: { workspaceId: id, direction: "OUT", createdAt: { gte: since30 } } }),
    prisma.message.count({ where: { workspaceId: id, direction: "IN", createdAt: { gte: since30 } } }),
    prisma.outboxMessage.groupBy({ by: ["status"], where: { workspaceId: id }, _count: { _all: true } }),
    prisma.paymentLink.groupBy({ by: ["status"], where: { workspaceId: id }, _count: { _all: true } }),
    prisma.adminAuditLog.findMany({ where: { workspaceId: id }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, adminEmail: true, action: true, details: true, createdAt: true } }),
  ]);
  const flag = (rows: { active: boolean; _count: { _all: number } }[], active: boolean) => rows.find((row) => row.active === active)?._count._all ?? 0;
  return {
    workspace,
    members,
    contactCount,
    contactsSample,
    campaigns,
    automations: { active: flag(automations, true), inactive: flag(automations, false) },
    popups: { active: flag(popups, true), inactive: flag(popups, false) },
    integrations,
    apiKeys,
    usage: { out7, out30, in30 },
    outbox: Object.fromEntries(outbox.map((row) => [row.status, row._count._all])) as Record<string, number>,
    payments: Object.fromEntries(payments.map((row) => [row.status, row._count._all])) as Record<string, number>,
    audit,
  };
}

// ---------------------------------------------------------------------------------- subscrições e Stripe
export async function loadBilling() {
  const now = new Date();
  const [subscribed, pastDue, expiring, connect, linksByStatus, links7d, paid7d] = await Promise.all([
    prisma.workspace.findMany({ where: { OR: [{ stripeCustomerId: { not: null } }, { subStatus: { in: ["active", "past_due"] } }] }, orderBy: { stripeEventAt: { sort: "desc", nulls: "last" } }, take: 100, select: { id: true, name: true, subStatus: true, plan: true, stripeCustomerId: true, stripeSubscriptionId: true, stripeEventAt: true, blockedAt: true } }),
    prisma.workspace.count({ where: { subStatus: "past_due" } }),
    prisma.workspace.findMany({ where: { subStatus: "trialing", trialEndsAt: { gt: now, lt: new Date(now.getTime() + 3 * DAY) } }, orderBy: { trialEndsAt: "asc" }, take: 25, select: { id: true, name: true, ownerEmail: true, trialEndsAt: true } }),
    prisma.workspace.count({ where: { stripeConnectAccountId: { not: null } } }),
    prisma.paymentLink.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.paymentLink.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
    prisma.paymentLink.count({ where: { status: "PAID", paidAt: { gte: new Date(now.getTime() - 7 * DAY) } } }),
  ]);
  const withSub = subscribed.filter((row) => row.stripeSubscriptionId).length;
  const lastBillingEvent = subscribed.find((row) => row.stripeEventAt)?.stripeEventAt ?? null;
  return { subscribed, pastDue, expiring, connect, withSub, lastBillingEvent, links: { byStatus: Object.fromEntries(linksByStatus.map((row) => [row.status, row._count._all])) as Record<string, number>, created7d: links7d, paid7d } };
}

export async function loadAudit(take = 100) {
  return prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, adminEmail: true, workspaceId: true, action: true, details: true, createdAt: true } });
}
