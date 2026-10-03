import "server-only";
import { Prisma } from "@prisma/client";
import { enqueueText } from "@/lib/outbox/enqueue";
import { drainOutbox } from "@/lib/outbox/process";
import { prisma } from "@/lib/prisma";
import { findBuiltIn } from "@/lib/segments/builtin";
import { parseRules, rulesToFilter, type SegmentRules } from "@/lib/segments/rules";
import {
  MAX_ACTIVE_CAMPAIGNS,
  MAX_AUDIENCE,
  finalStatus,
  renderMessage,
  resolveSchedule,
  type CampaignCounters,
  type CampaignInput,
  type CampaignStatusValue,
} from "@/lib/campaigns/schema";

// O motor das campanhas. Seguro com vários workers (cron e pedidos em paralelo):
//  * arrancar uma campanha é uma transição atómica SCHEDULED → SENDING (updateMany com a condição): só um ganha;
//  * os destinatários são reivindicados com UPDATE ... FOR UPDATE SKIP LOCKED, como na fila de saída;
//  * cada envio passa por enqueueText: paywall, janela de 24 h da Meta, canal ligado e ritmo controlado são os
//    MESMOS que valem para a Inbox e para a IA. Quem está fora da janela é ignorado (e contado), nunca forçado:
//    a Meta só permite mensagem livre dentro das 24 h e um envio em massa fora disso arriscava o número;
//  * quem pediu para não receber mensagens automáticas nunca recebe;
//  * um destinatário "a meio" de um worker morto NUNCA é reenviado (ficaria duplicado ao cliente): falha.

const PER_RUN = () => Number(process.env.CAMPAIGN_MAX_PER_RUN) || 100;
const STALE_AFTER_MS = 10 * 60 * 1000;

export type CreateError = "invalid_segment" | "invalid_schedule" | "too_many_active";

// Cria a campanha. Se for "agora", arranca já e enfileira o primeiro lote.
export async function createCampaign(input: { workspaceId: string; userId?: string; data: CampaignInput }): Promise<{ ok: true; id: string } | { ok: false; error: CreateError }> {
  const { workspaceId, data } = input;
  const now = new Date();
  const scheduledAt = resolveSchedule(data.schedule, now);
  if (!scheduledAt) return { ok: false, error: "invalid_schedule" };

  const [kind, key] = data.segment.split(":");
  let segmentName: string;
  let rules: SegmentRules;
  if (kind === "builtin") {
    const builtIn = findBuiltIn(key);
    if (!builtIn) return { ok: false, error: "invalid_segment" };
    segmentName = builtIn.name;
    rules = builtIn.rules;
  } else {
    const segment = await prisma.segment.findFirst({ where: { id: key, workspaceId }, select: { name: true, rules: true } });
    if (!segment) return { ok: false, error: "invalid_segment" };
    segmentName = segment.name;
    rules = parseRules(segment.rules);
  }

  const active = await prisma.campaign.count({ where: { workspaceId, status: { in: ["SCHEDULED", "SENDING"] } } });
  if (active >= MAX_ACTIVE_CAMPAIGNS) return { ok: false, error: "too_many_active" };

  const campaign = await prisma.campaign.create({
    data: { workspaceId, name: data.name, message: data.message, segmentName, rules, scheduledAt, createdById: input.userId ?? null },
    select: { id: true },
  });
  if (data.schedule.mode === "now") {
    await startCampaign(campaign.id);
    await processCampaign(campaign.id, { limit: PER_RUN() });
    await drainOutbox(8_000);
  }
  return { ok: true, id: campaign.id };
}

// SCHEDULED → SENDING, e calcula a audiência (os contactos que cumprem as regras AGORA).
export async function startCampaign(campaignId: string): Promise<boolean> {
  const claimed = await prisma.campaign.updateMany({ where: { id: campaignId, status: "SCHEDULED" }, data: { status: "SENDING", startedAt: new Date() } });
  if (claimed.count !== 1) return false;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { workspaceId: true, rules: true } });
  if (!campaign) return false;
  const contacts = await prisma.contact.findMany({
    where: { workspaceId: campaign.workspaceId, ...rulesToFilter(parseRules(campaign.rules), new Date()) },
    orderBy: { createdAt: "asc" },
    take: MAX_AUDIENCE,
    select: { id: true, optedOutAt: true },
  });
  if (contacts.length > 0) {
    await prisma.campaignRecipient.createMany({
      data: contacts.map((contact) => ({
        campaignId,
        workspaceId: campaign.workspaceId,
        contactId: contact.id,
        ...(contact.optedOutAt ? { status: "SKIPPED" as const, reason: "opted_out" } : {}),
      })),
      skipDuplicates: true,
    });
  }
  await prisma.campaign.update({ where: { id: campaignId }, data: { totalRecipients: contacts.length } });
  await finishIfDone(campaignId);
  return true;
}

interface ClaimedRecipient {
  id: string;
  contactId: string;
}

async function claimRecipients(campaignId: string, limit: number): Promise<ClaimedRecipient[]> {
  return prisma.$queryRaw<ClaimedRecipient[]>`
    WITH picked AS (
      SELECT "id" FROM "CampaignRecipient"
      WHERE "campaignId" = ${campaignId} AND "status" = 'PENDING'
      ORDER BY "id" ASC
      LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "CampaignRecipient" AS r
    SET "status" = 'PROCESSING', "updatedAt" = timezone('utc', now())
    FROM picked
    WHERE r."id" = picked."id"
    RETURNING r."id", r."contactId"
  `;
}

const SKIP_ERRORS: Record<string, string> = { window_closed: "window_closed", no_integration: "no_integration", not_found: "no_conversation" };

// Enfileira um lote de destinatários desta campanha. Devolve quantos foram processados.
export async function processCampaign(campaignId: string, options: { limit: number; deadlineAt?: number }): Promise<number> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, workspaceId: true, message: true, status: true } });
  if (!campaign || campaign.status !== "SENDING") return 0;

  const batch = await claimRecipients(campaignId, options.limit);
  let processed = 0;
  for (const [index, recipient] of batch.entries()) {
    if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) {
      await prisma.campaignRecipient.updateMany({ where: { id: { in: batch.slice(index).map((r) => r.id) }, status: "PROCESSING" }, data: { status: "PENDING" } });
      break;
    }
    await sendToRecipient(campaign, recipient);
    processed++;
  }
  await finishIfDone(campaignId);
  return processed;
}

async function sendToRecipient(campaign: { workspaceId: string; message: string }, recipient: ClaimedRecipient) {
  const settle = (status: "QUEUED" | "SKIPPED" | "FAILED", reason?: string, messageId?: string) =>
    prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status, reason: reason ?? null, messageId: messageId ?? null } });

  try {
    const contact = await prisma.contact.findFirst({ where: { id: recipient.contactId, workspaceId: campaign.workspaceId }, select: { name: true, optedOutAt: true } });
    if (!contact) return void (await settle("SKIPPED", "no_conversation"));
    // Voltar a verificar agora: pode ter pedido para parar entre o arranque e este envio.
    if (contact.optedOutAt) return void (await settle("SKIPPED", "opted_out"));

    const conversation = await prisma.conversation.findFirst({
      where: { contactId: recipient.contactId, workspaceId: campaign.workspaceId },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    });
    if (!conversation) return void (await settle("SKIPPED", "no_conversation"));

    const result = await enqueueText({ workspaceId: campaign.workspaceId, conversationId: conversation.id, text: renderMessage(campaign.message, contact.name) });
    if (result.ok) return void (await settle("QUEUED", undefined, result.messages[0]?.id));
    if (result.error === "subscription_required") return void (await settle("FAILED", "subscription_required"));
    await settle("SKIPPED", SKIP_ERRORS[result.error] ?? "invalid");
  } catch (err) {
    // Erro nosso (base de dados...). Antes de enfileirar nada saiu, mas não se sabe em que ponto parou:
    // marca falha em vez de repetir (um duplicado ao cliente é pior do que uma falha visível).
    console.error("[campaigns] falha ao enviar a um destinatário", recipient.id, err);
    await settle("FAILED", "internal").catch(() => {});
  }
}

// Sem destinatários por processar → fecha a campanha (COMPLETED, ou FAILED se nada seguiu e houve falhas).
async function finishIfDone(campaignId: string) {
  const open = await prisma.campaignRecipient.count({ where: { campaignId, status: { in: ["PENDING", "PROCESSING"] } } });
  if (open > 0) return;
  const grouped = await prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });
  const n = (status: string) => grouped.find((g) => g.status === status)?._count._all ?? 0;
  const status = finalStatus({ queued: n("QUEUED"), sent: 0, delivered: 0, read: 0, failed: n("FAILED"), skipped: n("SKIPPED") });
  await prisma.campaign.updateMany({ where: { id: campaignId, status: "SENDING" }, data: { status, completedAt: new Date() } });
}

export interface CampaignRunSummary {
  started: number;
  processed: number;
  stale: number;
}

// O que o cron faz: arranca as campanhas cuja hora chegou, processa os lotes das que estão a enviar e recupera
// destinatários presos por um worker que morreu.
export async function runCampaigns(options: { deadlineAt?: number } = {}): Promise<CampaignRunSummary> {
  const summary: CampaignRunSummary = { started: 0, processed: 0, stale: 0 };

  const stale = await prisma.campaignRecipient.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } },
    data: { status: "FAILED", reason: "worker_interrupted" },
  });
  summary.stale = stale.count;

  const due = await prisma.campaign.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, workspace: { blockedAt: null, approvalStatus: "APPROVED" } }, orderBy: { scheduledAt: "asc" }, take: 10, select: { id: true } });
  for (const campaign of due) if (await startCampaign(campaign.id)) summary.started++;

  const sending = await prisma.campaign.findMany({ where: { status: "SENDING", workspace: { blockedAt: null, approvalStatus: "APPROVED" } }, orderBy: { startedAt: "asc" }, take: 10, select: { id: true } });
  let budget = PER_RUN();
  for (const campaign of sending) {
    if (budget <= 0 || (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt)) break;
    const done = await processCampaign(campaign.id, { limit: budget, deadlineAt: options.deadlineAt });
    summary.processed += done;
    budget -= done;
  }
  // Campanhas que ficaram sem pendentes entre execuções (ex.: worker interrompido a recuperar).
  for (const campaign of sending) await finishIfDone(campaign.id);
  return summary;
}

// Cancela: o que ainda não foi enfileirado não sai. O que já está na fila de saída segue o seu caminho.
export async function cancelCampaign(workspaceId: string, campaignId: string): Promise<"cancelled" | "not_found" | "not_active"> {
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, workspaceId }, select: { status: true } });
  if (!campaign) return "not_found";
  const changed = await prisma.campaign.updateMany({ where: { id: campaignId, workspaceId, status: { in: ["SCHEDULED", "SENDING"] } }, data: { status: "CANCELLED", completedAt: new Date() } });
  if (changed.count !== 1) return "not_active";
  await prisma.campaignRecipient.updateMany({ where: { campaignId, status: "PENDING" }, data: { status: "SKIPPED", reason: "cancelled" } });
  return "cancelled";
}

export interface CampaignRow {
  id: string;
  name: string;
  segmentName: string;
  message: string;
  status: CampaignStatusValue;
  scheduledAt: Date;
  counters: CampaignCounters;
  skipped: Record<string, number>;
}

// As campanhas da organização com contadores REAIS: os destinatários dizem quem foi enfileirado/ignorado/falhou, e
// a mensagem de cada um diz o que a Meta fez a seguir (enviada, entregue, lida, falhada).
export async function listCampaigns(workspaceId: string, take = 30): Promise<CampaignRow[]> {
  const campaigns = await prisma.campaign.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take });
  if (campaigns.length === 0) return [];
  const ids = campaigns.map((c) => c.id);

  const [byRecipient, byMessage, bySkip] = await Promise.all([
    prisma.campaignRecipient.groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: ids } }, _count: { _all: true } }),
    prisma.$queryRaw<{ campaignId: string; status: string; n: number }[]>(Prisma.sql`
      SELECT r."campaignId" AS "campaignId", m."status" AS status, count(*)::int AS n
      FROM "CampaignRecipient" r JOIN "Message" m ON m."id" = r."messageId"
      WHERE r."campaignId" IN (${Prisma.join(ids)}) AND r."workspaceId" = ${workspaceId}
      GROUP BY r."campaignId", m."status"`),
    prisma.campaignRecipient.groupBy({ by: ["campaignId", "reason"], where: { campaignId: { in: ids }, status: { in: ["SKIPPED", "FAILED"] } }, _count: { _all: true } }),
  ]);

  return campaigns.map((campaign) => {
    const r = (status: string) => byRecipient.find((g) => g.campaignId === campaign.id && g.status === status)?._count._all ?? 0;
    const m = (status: string) => byMessage.find((g) => g.campaignId === campaign.id && g.status === status)?.n ?? 0;
    const read = m("READ");
    const delivered = m("DELIVERED") + read;
    const sent = m("SENT") + delivered;
    const skipped: Record<string, number> = {};
    for (const g of bySkip) if (g.campaignId === campaign.id && g.reason) skipped[g.reason] = g._count._all;
    return {
      id: campaign.id,
      name: campaign.name,
      segmentName: campaign.segmentName,
      message: campaign.message,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt,
      skipped,
      counters: {
        total: campaign.totalRecipients,
        pending: r("PENDING") + r("PROCESSING"),
        queued: m("QUEUED"),
        sent,
        delivered,
        read,
        failed: r("FAILED") + m("FAILED"),
        skipped: r("SKIPPED"),
      },
    };
  });
}
