import "server-only";
import { prisma } from "@/lib/prisma";
import { diagnose, type DiagnosticFacts, type Finding } from "@/lib/admin/diagnose";
import { MAX_ACTIVE_CAMPAIGNS } from "@/lib/campaigns/schema";
import { MAX_AUTOMATIONS } from "@/lib/automations/schema";
import { MAX_DOCS, MAX_TASKS } from "@/lib/crm/schemas";
import { MAX_POPUPS } from "@/lib/popups/schema";
import { MAX_TEMPLATES } from "@/lib/templates/schema";
import { TEAM_SEATS } from "@/lib/roles";

const MIN = 60_000;
const DAY = 86_400_000;

// "token_expired: detalhe" -> "token_expired" (as repetições gravam o detalhe a seguir ao motivo).
const reasonOf = (text: string | null) => (text ?? "desconhecido").split(":")[0].trim().slice(0, 60) || "desconhecido";
function tally(rows: { reason: string | null; n: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) out[reasonOf(row.reason)] = (out[reasonOf(row.reason)] ?? 0) + row.n;
  return out;
}

// O que falta configurar no servidor e o que isso estraga (afeta TODAS as organizações).
const PLATFORM_CONSEQUENCES: { env: string[]; label: string; consequence: string }[] = [
  { env: ["STRIPE_WEBHOOK_SECRET"], label: "STRIPE_WEBHOOK_SECRET", consequence: "Os eventos de faturação do Stripe não podem ser verificados: as subscrições não se atualizam (pagamentos, cancelamentos, renovações)." },
  { env: ["CRON_SECRET"], label: "CRON_SECRET", consequence: "Os workers (fila de envio, seguimentos, campanhas e automações) recusam os pedidos do cron: nada disso corre sozinho." },
  { env: ["META_APP_SECRET"], label: "META_APP_SECRET", consequence: "Os webhooks da Meta não podem ser verificados: as mensagens recebidas não entram na Inbox." },
  { env: ["OPENROUTER_API_KEY"], label: "OPENROUTER_API_KEY", consequence: "A IA não tem chave do modelo: nenhum agente responde." },
  { env: ["RESEND_API_KEY", "EMAIL_FROM"], label: "RESEND_API_KEY / EMAIL_FROM", consequence: "Não se enviam e-mails (confirmação de registo, convites, aprovações)." },
];

export function platformMissing(): DiagnosticFacts["platform"]["missing"] {
  return PLATFORM_CONSEQUENCES.filter((item) => item.env.some((name) => !process.env[name]?.trim())).map((item) => ({ label: item.label, consequence: item.consequence }));
}

// Recolhe os factos técnicos de UMA organização e deixa a regra pura diagnosticá-los.
export async function diagnoseOrganization(workspaceId: string): Promise<{ name: string; findings: Finding[] } | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, subStatus: true, trialEndsAt: true, approvalStatus: true, approvalNote: true, blockedAt: true, blockedReason: true, stripeSubscriptionId: true, periodEnd: true, cancelAtPeriodEnd: true, agentEnabled: true, agentKnowledge: true, stripeConnectAccountId: true, createdAt: true },
  });
  if (!workspace) return null;
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY);
  const since7d = new Date(now.getTime() - 7 * DAY);
  const id = workspaceId;

  const [integrations, lastInbound, pending, oldestPending, stale, outboxFailed, msgFailed, stuckCampaigns, skipped, failed, overdue, autoFailed, apiKeys, paymentItems, counts] = await Promise.all([
    prisma.socialIntegration.findMany({ where: { workspaceId: id }, select: { platform: true, status: true, tokenExpiresAt: true } }),
    prisma.message.findFirst({ where: { workspaceId: id, direction: "IN" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.outboxMessage.count({ where: { workspaceId: id, status: "PENDING" } }),
    prisma.outboxMessage.findFirst({ where: { workspaceId: id, status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.outboxMessage.count({ where: { workspaceId: id, status: "PROCESSING", updatedAt: { lt: new Date(now.getTime() - 10 * MIN) } } }),
    prisma.outboxMessage.groupBy({ by: ["errorMessage"], where: { workspaceId: id, status: "FAILED", updatedAt: { gte: since24h } }, _count: { _all: true } }),
    prisma.message.groupBy({ by: ["errorMessage"], where: { workspaceId: id, direction: "OUT", status: "FAILED", createdAt: { gte: since24h } }, _count: { _all: true } }),
    prisma.campaign.count({ where: { workspaceId: id, status: "SENDING", startedAt: { lt: new Date(now.getTime() - 30 * MIN) }, recipients: { some: { status: { in: ["PENDING", "PROCESSING"] } } } } }),
    prisma.campaignRecipient.groupBy({ by: ["reason"], where: { workspaceId: id, status: "SKIPPED", updatedAt: { gte: since7d } }, _count: { _all: true } }),
    prisma.campaignRecipient.groupBy({ by: ["reason"], where: { workspaceId: id, status: "FAILED", updatedAt: { gte: since7d } }, _count: { _all: true } }),
    prisma.automationRunStep.count({ where: { workspaceId: id, status: "PENDING", dueAt: { lt: new Date(now.getTime() - 15 * MIN) }, run: { automation: { active: true } } } }),
    prisma.automationRunStep.groupBy({ by: ["reason"], where: { workspaceId: id, status: "FAILED", doneAt: { gte: since24h } }, _count: { _all: true } }),
    prisma.apiKey.findMany({ where: { workspaceId: id }, select: { revokedAt: true, lastUsedAt: true } }),
    prisma.paymentItem.count({ where: { workspaceId: id, active: true } }),
    Promise.all([
      prisma.user.count({ where: { workspaceId: id } }),
      prisma.teamInvite.count({ where: { workspaceId: id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } } }),
      prisma.automation.count({ where: { workspaceId: id } }),
      prisma.popup.count({ where: { workspaceId: id } }),
      prisma.campaign.count({ where: { workspaceId: id, status: { in: ["SCHEDULED", "SENDING"] } } }),
      prisma.task.count({ where: { workspaceId: id } }),
      prisma.doc.count({ where: { workspaceId: id } }),
      prisma.messageTemplate.count({ where: { workspaceId: id } }),
      prisma.segment.count({ where: { workspaceId: id } }),
    ]),
  ]);
  const [members, invites, automations, popups, activeCampaigns, tasks, docs, templates, segments] = counts;
  const active = apiKeys.filter((key) => !key.revokedAt);

  const facts: DiagnosticFacts = {
    now,
    org: { subStatus: workspace.subStatus, trialEndsAt: workspace.trialEndsAt, approvalStatus: workspace.approvalStatus, approvalNote: workspace.approvalNote, blocked: workspace.blockedAt !== null, blockedReason: workspace.blockedReason, hasStripeSubscription: Boolean(workspace.stripeSubscriptionId), periodEnd: workspace.periodEnd, cancelAtPeriodEnd: workspace.cancelAtPeriodEnd, agentEnabled: workspace.agentEnabled, hasKnowledge: Boolean(workspace.agentKnowledge?.trim()), hasConnectAccount: Boolean(workspace.stripeConnectAccountId), paymentItems, createdAt: workspace.createdAt },
    integrations,
    lastInboundAt: lastInbound?.createdAt ?? null,
    outbox: {
      pending,
      oldestPendingAt: oldestPending?.createdAt ?? null,
      staleProcessing: stale,
      // As falhas vêm da fila e da mensagem; contam-se pela da fila (a mensagem é a mesma) e usa-se a da mensagem como reforço.
      failed24h: Object.keys(tally(outboxFailed.map((row) => ({ reason: row.errorMessage, n: row._count._all })))).length ? tally(outboxFailed.map((row) => ({ reason: row.errorMessage, n: row._count._all }))) : tally(msgFailed.map((row) => ({ reason: row.errorMessage, n: row._count._all }))),
    },
    campaigns: { stuckSending: stuckCampaigns, skipped7d: tally(skipped.map((row) => ({ reason: row.reason, n: row._count._all }))), failed7d: tally(failed.map((row) => ({ reason: row.reason, n: row._count._all }))) },
    automations: { overdueSteps: overdue, failed24h: tally(autoFailed.map((row) => ({ reason: row.reason, n: row._count._all }))) },
    limits: [
      { label: "lugares da equipa", used: members + invites, max: TEAM_SEATS, consequence: "Não é possível convidar mais pessoas." },
      { label: "automações", used: automations, max: MAX_AUTOMATIONS, consequence: "Não é possível criar mais automações." },
      { label: "popups", used: popups, max: MAX_POPUPS, consequence: "Não é possível criar mais popups." },
      { label: "campanhas ativas", used: activeCampaigns, max: MAX_ACTIVE_CAMPAIGNS, consequence: "Não é possível criar novas campanhas até as ativas terminarem." },
      { label: "tarefas", used: tasks, max: MAX_TASKS, consequence: "O quadro não aceita mais tarefas, nem as criadas por automações." },
      { label: "documentos", used: docs, max: MAX_DOCS, consequence: "Não é possível criar mais documentos." },
      { label: "templates", used: templates, max: MAX_TEMPLATES, consequence: "Não é possível guardar mais modelos." },
      { label: "segmentos", used: segments, max: 50, consequence: "Não é possível criar mais segmentos." },
    ],
    apiKeys: { active: active.length, revoked: apiKeys.length - active.length, neverUsed: active.filter((key) => !key.lastUsedAt).length },
    platform: { missing: platformMissing() },
  };
  return { name: workspace.name, findings: diagnose(facts) };
}

// A visão global: o que está mal na PLATAFORMA e que organizações têm problemas, sem diagnosticar cada uma a fundo.
export async function loadPlatformDiagnostics() {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY);
  const [failed, expired, pastDue, pending, overdueOutbox, overdueSteps, stuckCampaigns] = await Promise.all([
    prisma.outboxMessage.groupBy({ by: ["workspaceId"], where: { status: "FAILED", updatedAt: { gte: since24h } }, _count: { _all: true }, orderBy: { _count: { workspaceId: "desc" } }, take: 15 }),
    prisma.socialIntegration.groupBy({ by: ["workspaceId"], where: { status: { not: "ACTIVE" } }, _count: { _all: true }, orderBy: { workspaceId: "asc" }, take: 25 }),
    prisma.workspace.findMany({ where: { subStatus: "past_due", approvalStatus: "APPROVED" }, select: { id: true }, take: 25 }),
    prisma.workspace.findMany({ where: { approvalStatus: "PENDING_APPROVAL" }, select: { id: true }, take: 25 }),
    prisma.outboxMessage.findFirst({ where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 15 * MIN) } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.automationRunStep.count({ where: { status: "PENDING", dueAt: { lt: new Date(now.getTime() - 15 * MIN) }, run: { automation: { active: true } } } }),
    prisma.campaign.count({ where: { status: "SENDING", startedAt: { lt: new Date(now.getTime() - 30 * MIN) } } }),
  ]);
  const names = new Map(
    (await prisma.workspace.findMany({ where: { id: { in: [...failed.map((r) => r.workspaceId), ...expired.map((r) => r.workspaceId), ...pastDue.map((r) => r.id), ...pending.map((r) => r.id)] } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]),
  );
  const issues = new Map<string, { id: string; name: string; problems: string[] }>();
  const push = (id: string, problem: string) => {
    const entry = issues.get(id) ?? { id, name: names.get(id) ?? id, problems: [] };
    entry.problems.push(problem);
    issues.set(id, entry);
  };
  for (const row of failed) push(row.workspaceId, `${row._count._all} envio(s) falhado(s) nas últimas 24 h`);
  for (const row of expired) push(row.workspaceId, `${row._count._all} canal(is) com o token recusado`);
  for (const row of pastDue) push(row.id, "Pagamento em atraso");
  for (const row of pending) push(row.id, "Conta por aprovar");

  const platform: Finding[] = [];
  if (overdueOutbox) platform.push({ id: "outbox_stuck", severity: "critical", title: "Fila de envio parada (toda a plataforma)", meaning: `Há mensagens pendentes há mais de ${Math.round((now.getTime() - overdueOutbox.createdAt.getTime()) / MIN)} minutos. O envio de reserva (workflow do GitHub, de 5 em 5 minutos) não está a correr.`, fix: "Verifique o workflow «outbox» no GitHub (Actions) e os secrets CRON_SECRET e APP_URL." });
  if (overdueSteps) platform.push({ id: "automations_overdue", severity: "critical", title: "Automações atrasadas", meaning: `${overdueSteps} ação(ões) de automações estão em atraso: o cron não está a correr.`, fix: "Verifique o workflow «outbox» no GitHub e os secrets CRON_SECRET e APP_URL." });
  if (stuckCampaigns) platform.push({ id: "campaigns_stuck", severity: "critical", title: "Campanhas presas", meaning: `${stuckCampaigns} campanha(s) a enviar há mais de meia hora.`, fix: "Verifique o workflow «outbox» no GitHub." });
  for (const item of platformMissing()) platform.push({ id: `env_${item.label}`, severity: "critical", title: `Servidor: ${item.label} em falta`, meaning: item.consequence, fix: "Configure-o na Vercel (Settings → Environment Variables) e faça um novo deploy." });
  return { platform, organizations: [...issues.values()] };
}
