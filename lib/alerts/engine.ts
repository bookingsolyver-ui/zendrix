import "server-only";
import { prisma } from "@/lib/prisma";
import { contactLabel } from "@/lib/inbox/display";
import { NotificationService } from "@/lib/alerts/notification-service";
import { churnMessage, daysSince, DAY_MS, marginImpact, marginMessage, parseRates, rateDriftPercent, readThresholds, type RiskThresholds } from "@/lib/alerts/risk";

// SmartAlertsEngine: varre a base de dados (uma vez por dia, a partir de /api/cron/smart-alerts) e transforma riscos em
// notificações. Só LÊ os dados do CRM e SÓ escreve em AppNotification: não altera contactos, conversas nem negócios.
//
// «Negócio» no Kwanza Flow = um contacto numa fase ativa do funil (leadStage) + os links de pagamento em aberto.
//  a) Risco de churn: contacto em fase ativa cuja ÚLTIMA mensagem é nossa (OUT) e o cliente não responde há mais de X dias.
//  b) Margem: links de pagamento em aberto numa moeda diferente da moeda base, cujo câmbio de hoje se afastou do de referência.

const ACTIVE_STAGES = ["ENGAGED", "QUALIFIED", "PAYMENT_SENT"] as const;
const SCAN_LIMIT = 500; // por execução; o resto fica para o dia seguinte (ordenado pelos mais antigos primeiro)
const LOOKBACK_DAYS = 90; // mais antigo que isto já não é um negócio vivo

export interface AlertsSummary {
  churnChecked: number;
  churnAlerts: number;
  marginChecked: number;
  marginAlerts: number;
}

// Só organizações aprovadas e não suspensas: a uma conta por aprovar ou bloqueada não se escreve.
const liveWorkspace = { approvalStatus: "APPROVED" as const, blockedAt: null };

export async function scanChurnRisk(thresholds: RiskThresholds, now: Date): Promise<Pick<AlertsSummary, "churnChecked" | "churnAlerts">> {
  const cutoff = new Date(now.getTime() - thresholds.churnDays * DAY_MS);
  const floor = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS);
  const conversations = await prisma.conversation.findMany({
    where: {
      lastMessageAt: { lt: cutoff, gt: floor },
      workspace: liveWorkspace,
      contact: { leadStage: { in: [...ACTIVE_STAGES] }, optedOutAt: null },
    },
    orderBy: { lastMessageAt: "asc" },
    take: SCAN_LIMIT,
    select: {
      workspaceId: true,
      contact: { select: { id: true, name: true, waId: true, platform: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, direction: true, createdAt: true } },
    },
  });

  let alerts = 0;
  for (const conversation of conversations) {
    const last = conversation.messages[0];
    // Se a última mensagem é do cliente, a bola está do nosso lado: não é ele que não responde.
    if (!last || last.direction !== "OUT") continue;
    const days = daysSince(last.createdAt, now);
    const name = contactLabel(conversation.contact.name, conversation.contact.waId, conversation.contact.platform);
    const created = await NotificationService.notify({
      workspaceId: conversation.workspaceId,
      kind: "churn_risk",
      severity: days >= thresholds.churnDays * 2 ? "critical" : "warning",
      title: "Risco de perder um negócio",
      body: churnMessage(name, days),
      contactId: conversation.contact.id,
      dedupeKey: `churn:${conversation.contact.id}:${last.id}`, // um aviso por silêncio: só volta a avisar se houver nova troca
    });
    if (created) alerts++;
  }
  return { churnChecked: conversations.length, churnAlerts: alerts };
}

export async function scanMarginRisk(thresholds: RiskThresholds, now: Date): Promise<Pick<AlertsSummary, "marginChecked" | "marginAlerts">> {
  const baseCurrency = (process.env.BASE_CURRENCY || "EUR").toUpperCase();
  const baseline = parseRates(process.env.FX_RATES_BASELINE);
  const today = parseRates(process.env.FX_RATES_TODAY);
  const links = await prisma.paymentLink.findMany({
    where: { status: "OPEN", currency: { not: baseCurrency }, workspaceId: { in: (await prisma.workspace.findMany({ where: liveWorkspace, select: { id: true } })).map((w) => w.id) } },
    take: SCAN_LIMIT,
    orderBy: { createdAt: "asc" },
    select: { id: true, workspaceId: true, contactId: true, currency: true, amountMinor: true },
  });

  // Um aviso por organização, moeda e dia, somando a exposição (não um por link).
  const grouped = new Map<string, { workspaceId: string; currency: string; impact: number; drift: number }>();
  for (const link of links) {
    const currency = link.currency.toUpperCase();
    const from = baseline[currency];
    const to = today[currency];
    if (!from || !to) continue; // sem câmbio conhecido não se inventa um alerta
    const drift = rateDriftPercent(from, to);
    if (drift > -thresholds.marginDriftPercent) continue; // só interessa a queda (receber menos); subidas são boas notícias
    const key = `${link.workspaceId}:${currency}`;
    const entry = grouped.get(key) ?? { workspaceId: link.workspaceId, currency, impact: 0, drift };
    entry.impact += marginImpact(link.amountMinor, from, to);
    grouped.set(key, entry);
  }

  const day = now.toISOString().slice(0, 10);
  let alerts = 0;
  for (const entry of grouped.values()) {
    const created = await NotificationService.notify({
      workspaceId: entry.workspaceId,
      kind: "margin_risk",
      severity: Math.abs(entry.drift) >= thresholds.marginDriftPercent * 2 ? "critical" : "warning",
      title: "Margem de lucro afetada",
      body: marginMessage(entry.currency, entry.drift, entry.impact, baseCurrency),
      dedupeKey: `fx:${entry.currency}:${day}`,
    });
    if (created) alerts++;
  }
  return { marginChecked: links.length, marginAlerts: alerts };
}

export const SmartAlertsEngine = {
  async run(now = new Date()): Promise<AlertsSummary> {
    const thresholds = readThresholds();
    const [churn, margin] = await Promise.all([scanChurnRisk(thresholds, now), scanMarginRisk(thresholds, now)]);
    return { ...churn, ...margin };
  },
};
