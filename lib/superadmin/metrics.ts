import "server-only";
import { prisma } from "@/lib/prisma";
import { loadOverview } from "@/lib/admin/queries";
import { daysSinceLogin, isChurnRisk } from "@/lib/superadmin/churn";
import { dailyLimit, dayKey } from "@/lib/superadmin/quota-rules";

// Métricas da Nave-Mãe. Reutiliza o que o painel /admin já calcula (MRR a partir do preço do Stripe, estados das subscrições) e
// acrescenta o que faltava: último login por organização (churn risk), consumo de IA e eventos. Só LÊ.
//
// Último login: vem de auth.users.last_sign_in_at (o Supabase). Só avança quando alguém INICIA SESSÃO; uma sessão aberta e renovada
// durante semanas não conta como login. Por isso aparece também a última mensagem enviada (atividade real) como contexto.

export async function lastLoginByWorkspace(): Promise<Map<string, Date | null>> {
  const rows = await prisma.$queryRaw<{ workspaceId: string; last_login: Date | null }[]>`
    SELECT u."workspaceId", max(a.last_sign_in_at) AS last_login
    FROM "User" u LEFT JOIN auth.users a ON a.id::text = u."authId"
    GROUP BY u."workspaceId"`;
  return new Map(rows.map((r) => [r.workspaceId, r.last_login]));
}

export async function loadMothership(now = new Date()) {
  const [overview, logins, workspaces, usage, events] = await Promise.all([
    loadOverview(),
    lastLoginByWorkspace(),
    prisma.workspace.findMany({ where: { approvalStatus: "APPROVED", subStatus: { in: ["active", "trialing"] } }, select: { id: true, name: true, ownerEmail: true, subStatus: true, createdAt: true, blockedAt: true } }),
    prisma.kwanzaAdmin_Usage.findMany({ where: { day: dayKey(now), metric: "ai_calls" }, orderBy: { count: "desc" }, take: 10 }),
    prisma.kwanzaAdmin_Event.groupBy({ by: ["severity"], where: { createdAt: { gt: new Date(now.getTime() - 86_400_000) } }, _count: { _all: true } }),
  ]);

  const atRisk = workspaces
    .map((w) => ({ ...w, lastLogin: logins.get(w.id) ?? null }))
    .filter((w) => isChurnRisk({ lastLogin: w.lastLogin, createdAt: w.createdAt, subStatus: w.subStatus, blocked: !!w.blockedAt }, now))
    .sort((a, b) => (a.lastLogin?.getTime() ?? 0) - (b.lastLogin?.getTime() ?? 0));
  const payingAtRisk = atRisk.filter((w) => w.subStatus === "active").length;
  const unit = overview.mrr && overview.activeSubs > 0 ? overview.mrr.amountMinor / overview.activeSubs : 0;

  const names = new Map((await prisma.workspace.findMany({ where: { id: { in: usage.map((u) => u.workspaceId) } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]));
  return {
    mrr: overview.mrr, // { amountMinor, currency } | null
    mrrAtRiskMinor: Math.round(payingAtRisk * unit),
    activeClients: overview.byStatus.active,
    trialing: overview.byStatus.trialing,
    pastDue: overview.byStatus.past_due,
    orgs: overview.orgs,
    churnRisk: atRisk.slice(0, 50).map((w) => ({ id: w.id, name: w.name, ownerEmail: w.ownerEmail, subStatus: w.subStatus, daysSinceLogin: daysSinceLogin(w.lastLogin, now) })),
    churnRiskTotal: atRisk.length,
    aiTopToday: usage.map((u) => ({ workspaceId: u.workspaceId, name: names.get(u.workspaceId) ?? u.workspaceId, count: u.count })),
    events24h: { critical: events.find((e) => e.severity === "critical")?._count._all ?? 0, warning: events.find((e) => e.severity === "warning")?._count._all ?? 0, info: events.find((e) => e.severity === "info")?._count._all ?? 0 },
    defaultLimit: dailyLimit(null, process.env.AI_CALLS_PER_DAY),
  };
}

export async function loadTenants(q: string | undefined, now = new Date()) {
  const workspaces = await prisma.workspace.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { ownerEmail: { contains: q, mode: "insensitive" } }, { id: q }] } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, ownerEmail: true, subStatus: true, blockedAt: true },
  });
  const ids = workspaces.map((w) => w.id);
  const [flags, usage, overrides, logins] = await Promise.all([
    prisma.kwanzaAdmin_FeatureFlag.findMany({ where: { workspaceId: { in: ids } }, select: { workspaceId: true, flag: true, enabled: true } }),
    prisma.kwanzaAdmin_Usage.findMany({ where: { workspaceId: { in: ids }, day: dayKey(now), metric: "ai_calls" }, select: { workspaceId: true, count: true } }),
    prisma.kwanzaAdmin_QuotaOverride.findMany({ where: { workspaceId: { in: ids }, metric: "ai_calls" }, select: { workspaceId: true, dailyLimit: true } }),
    lastLoginByWorkspace(),
  ]);
  return workspaces.map((w) => ({
    ...w,
    blocked: !!w.blockedAt,
    flags: flags.filter((f) => f.workspaceId === w.id).map((f) => ({ flag: f.flag, enabled: f.enabled })),
    aiToday: usage.find((u) => u.workspaceId === w.id)?.count ?? 0,
    aiLimit: dailyLimit(overrides.find((o) => o.workspaceId === w.id)?.dailyLimit, process.env.AI_CALLS_PER_DAY),
    daysSinceLogin: daysSinceLogin(logins.get(w.id) ?? null, now),
  }));
}

export async function loadEvents(limit = 100) {
  return prisma.kwanzaAdmin_Event.findMany({ orderBy: { createdAt: "desc" }, take: limit });
}
