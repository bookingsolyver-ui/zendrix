// Inteligência financeira. Puro (sem servidor): testável. Estatística simples e explicável (não é uma «IA» opaca):
// cada número tem uma razão que se mostra ao gestor.

export interface InvoiceOutcome {
  daysLate: number; // dias de atraso no pagamento (≤0 = a tempo). Para uma fatura ainda em aberto: dias desde o vencimento
  settled: boolean; // paga (true) ou ainda em aberto e vencida (false)
}

export type RiskTier = "low" | "medium" | "high";
export interface RiskScore {
  score: number; // 0 (confiável) a 1 (risco máximo de atraso)
  tier: RiskTier;
  sample: number; // quantas faturas sustentam o número
  reason: string;
}

const PRIOR = 0.3; // quem não tem histórico é neutro-baixo, não «seguro»
const PRIOR_WEIGHT = 0.5;
const LATE_SEVERE_DAYS = 15; // 15+ dias de atraso = pior nota numa fatura
const RECENT = 3;
const RECENT_LATE_DAYS = 10;
const RECENT_FLOOR = 0.7;

export const tierOf = (score: number): RiskTier => (score >= 0.6 ? "high" : score >= 0.3 ? "medium" : "low");

// `history` da mais RECENTE para a mais antiga. Faturas recentes pesam mais (decaimento 0,7 por posição).
export function riskScore(history: InvoiceOutcome[]): RiskScore {
  const items = history.slice(0, 8);
  if (items.length === 0) return { score: PRIOR, tier: tierOf(PRIOR), sample: 0, reason: "Sem histórico de pagamentos." };

  let weighted = 0;
  let weights = 0;
  items.forEach((item, index) => {
    const weight = Math.pow(0.7, index);
    weighted += weight * Math.min(1, Math.max(0, item.daysLate) / LATE_SEVERE_DAYS);
    weights += weight;
  });
  let score = (weighted + PRIOR * PRIOR_WEIGHT) / (weights + PRIOR_WEIGHT);

  // A regra de negócio: as últimas 3 pagas com mais de 10 dias de atraso => risco elevado, qualquer que seja a média.
  const last = items.slice(0, RECENT);
  const allRecentLate = last.length === RECENT && last.every((i) => i.daysLate > RECENT_LATE_DAYS);
  if (allRecentLate) score = Math.max(score, RECENT_FLOOR);

  score = Math.round(Math.min(1, score) * 100) / 100;
  const late = items.filter((i) => i.daysLate > 0).length;
  const reason = allRecentLate
    ? `As últimas ${RECENT} faturas foram pagas com mais de ${RECENT_LATE_DAYS} dias de atraso.`
    : `${late} de ${items.length} faturas com atraso.`;
  return { score, tier: tierOf(score), sample: items.length, reason };
}

// Taxa de ganho histórica com suavização: com poucos negócios fechados, puxa para um valor prudente (30%) em vez de
// confiar em 1 ganho em 1 tentativa = 100%.
export function winRate(won: number, lost: number, prior = 0.3, priorWeight = 3): { rate: number; won: number; lost: number; closed: number } {
  const closed = won + lost;
  return { rate: Math.round(((won + prior * priorWeight) / (closed + priorWeight)) * 1000) / 1000, won, lost, closed };
}

// Valor esperado de uma proposta: valor × taxa de ganho × probabilidade de receber a tempo (1 − risco do cliente).
export const expectedProposal = (amountMinor: number, win: number, risk: number) => Math.round(amountMinor * win * (1 - risk));
// Valor esperado de uma fatura a receber no mês: valor × (1 − risco de atraso).
export const expectedReceivable = (amountMinor: number, risk: number) => Math.round(amountMinor * (1 - risk));

// Próximo mês civil (UTC): [início, fim).
export function nextMonthRange(now: Date): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
  return { start, end, label: start.toISOString().slice(0, 7) };
}
