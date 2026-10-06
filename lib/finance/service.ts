import "server-only";
import { prisma } from "@/lib/prisma";
import { contactLabel } from "@/lib/inbox/display";
import { expectedProposal, expectedReceivable, nextMonthRange, riskScore, winRate, type InvoiceOutcome, type RiskScore } from "@/lib/finance/risk";

// PredictiveFinanceService: risco de atraso por cliente e previsão de receita do próximo mês. Só LÊ (cobranças, propostas,
// contactos); não grava nada. Matemática simples e explicável em lib/finance/risk.ts.
//
// Fonte do histórico de pagamentos: a tabela Receivable (única com vencimento E data de pagamento). Os links de pagamento
// do Stripe não têm vencimento, por isso não dão «atraso». Quem não usa cobranças fica sem histórico (score neutro).
// A taxa de ganho vem dos contactos fechados (WON vs LOST) da organização.

const DAY_MS = 86_400_000;
const HISTORY_DAYS = 365;

export interface CurrencyForecast {
  currency: string;
  receivablesDueNextMonth: { gross: number; expected: number; count: number };
  overdueRecoverable: { gross: number; expected: number; count: number };
  proposalsPipeline: { gross: number; expected: number; count: number };
  expectedTotal: number; // soma dos «expected» (minor units)
  atRisk: number; // valor bruto previsto que se espera atrasar/perder
}

export interface Forecast {
  month: string;
  winRate: ReturnType<typeof winRate>;
  currencies: CurrencyForecast[];
  riskyClients: { contactId: string; name: string; score: number; tier: string; reason: string }[];
  notes: string[];
}

type Receivable = { contactId: string; status: string; dueAt: Date; paidAt: Date | null; amountMinor: number; currency: string };

// Histórico por cliente, do mais recente para o mais antigo: pagas (atraso = pago - vencimento) e vencidas por pagar.
export function historyByContact(rows: Receivable[], now: Date): Map<string, InvoiceOutcome[]> {
  const dated: { contactId: string; at: number; outcome: InvoiceOutcome }[] = [];
  for (const r of rows) {
    if (r.status === "PAID" && r.paidAt) dated.push({ contactId: r.contactId, at: r.paidAt.getTime(), outcome: { daysLate: Math.floor((r.paidAt.getTime() - r.dueAt.getTime()) / DAY_MS), settled: true } });
    else if (r.status === "PENDING" && r.dueAt < now) dated.push({ contactId: r.contactId, at: now.getTime(), outcome: { daysLate: Math.floor((now.getTime() - r.dueAt.getTime()) / DAY_MS), settled: false } });
  }
  const map = new Map<string, InvoiceOutcome[]>();
  for (const d of dated.sort((a, b) => b.at - a.at)) map.set(d.contactId, [...(map.get(d.contactId) ?? []), d.outcome]);
  return map;
}

export const PredictiveFinanceService = {
  async scoreClient(workspaceId: string, contactId: string, now = new Date()): Promise<RiskScore> {
    const rows = await prisma.receivable.findMany({ where: { workspaceId, contactId, OR: [{ status: "PENDING" }, { status: "PAID", paidAt: { gte: new Date(now.getTime() - HISTORY_DAYS * DAY_MS) } }] }, take: 200 });
    return riskScore(historyByContact(rows, now).get(contactId) ?? []);
  },

  async forecast(workspaceId: string, now = new Date()): Promise<Forecast> {
    const { start, end, label } = nextMonthRange(now);
    const [rows, won, lost, proposals] = await Promise.all([
      prisma.receivable.findMany({ where: { workspaceId, OR: [{ status: "PENDING" }, { status: "PAID", paidAt: { gte: new Date(now.getTime() - HISTORY_DAYS * DAY_MS) } }] }, take: 5000 }),
      prisma.contact.count({ where: { workspaceId, leadStage: "WON" } }),
      prisma.contact.count({ where: { workspaceId, leadStage: "LOST" } }),
      prisma.proposal.findMany({ where: { workspaceId, status: "SENT", tokenExpiresAt: { gt: now } }, take: 2000, select: { contactId: true, amountMinor: true, currency: true } }),
    ]);

    const history = historyByContact(rows, now);
    const scores = new Map<string, RiskScore>();
    const scoreOf = (contactId: string) => scores.get(contactId) ?? (scores.set(contactId, riskScore(history.get(contactId) ?? [])), scores.get(contactId) as RiskScore);
    const win = winRate(won, lost);

    const byCurrency = new Map<string, CurrencyForecast>();
    const bucket = (currency: string) => byCurrency.get(currency) ?? (byCurrency.set(currency, { currency, receivablesDueNextMonth: { gross: 0, expected: 0, count: 0 }, overdueRecoverable: { gross: 0, expected: 0, count: 0 }, proposalsPipeline: { gross: 0, expected: 0, count: 0 }, expectedTotal: 0, atRisk: 0 }), byCurrency.get(currency) as CurrencyForecast);

    for (const r of rows) {
      if (r.status !== "PENDING" || r.dueAt >= end) continue;
      const expected = expectedReceivable(r.amountMinor, scoreOf(r.contactId).score);
      const b = bucket(r.currency.toUpperCase());
      const part = r.dueAt >= start ? b.receivablesDueNextMonth : b.overdueRecoverable; // vence no mês, ou já vencida
      part.gross += r.amountMinor;
      part.expected += expected;
      part.count++;
    }
    for (const p of proposals) {
      const b = bucket(p.currency.toUpperCase());
      b.proposalsPipeline.gross += p.amountMinor;
      b.proposalsPipeline.expected += expectedProposal(p.amountMinor, win.rate, scoreOf(p.contactId).score);
      b.proposalsPipeline.count++;
    }
    for (const b of byCurrency.values()) {
      b.expectedTotal = b.receivablesDueNextMonth.expected + b.overdueRecoverable.expected + b.proposalsPipeline.expected;
      b.atRisk = b.receivablesDueNextMonth.gross + b.overdueRecoverable.gross + b.proposalsPipeline.gross - b.expectedTotal;
    }

    const ranked = [...history.keys()].map((id) => ({ id, ...scoreOf(id) })).sort((a, b) => b.score - a.score).slice(0, 5);
    const contacts = await prisma.contact.findMany({ where: { workspaceId, id: { in: ranked.map((r) => r.id) } }, select: { id: true, name: true, waId: true, platform: true } });
    const nameOf = new Map(contacts.map((c) => [c.id, contactLabel(c.name, c.waId, c.platform)]));

    const notes = ["Valores esperados = valor × probabilidade; moedas diferentes nunca se somam.", "Propostas: valor × taxa de ganho histórica × (1 − risco do cliente)."];
    if (win.closed < 10) notes.push(`Poucos negócios fechados (${win.closed}): a taxa de ganho está suavizada para um valor prudente.`);
    if (rows.length === 0) notes.push("Ainda não há cobranças registadas: o risco dos clientes é neutro até haver histórico.");

    return { month: label, winRate: win, currencies: [...byCurrency.values()], riskyClients: ranked.map((r) => ({ contactId: r.id, name: nameOf.get(r.id) ?? r.id, score: r.score, tier: r.tier, reason: r.reason })), notes };
  },
};
