// Regras de risco dos Alertas Inteligentes. Puro (sem servidor): testável.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Dias inteiros desde `since`.
export const daysSince = (since: Date, now: Date) => Math.floor((now.getTime() - since.getTime()) / DAY_MS);

// Quanto o câmbio de hoje se afastou do de referência, em %. As taxas são «unidades da moeda base por 1 unidade da
// moeda do negócio»: negativo = a moeda do negócio valeu menos = recebe-se menos na moeda base.
export function rateDriftPercent(baseline: number, today: number): number {
  if (!(baseline > 0) || !(today > 0)) return 0;
  return Math.round(((today - baseline) / baseline) * 10_000) / 100;
}

// O valor (na moeda base) que o negócio perdeu ou ganhou com o câmbio. `amountMinor` em cêntimos.
export function marginImpact(amountMinor: number, baseline: number, today: number): number {
  return Math.round((amountMinor / 100) * (today - baseline) * 100) / 100;
}

export interface RiskThresholds {
  churnDays: number; // dias sem resposta do cliente
  marginDriftPercent: number; // desvio cambial a partir do qual avisar
}

export function readThresholds(env: Record<string, string | undefined> = process.env): RiskThresholds {
  const num = (value: string | undefined, fallback: number) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback);
  return { churnDays: num(env.SMART_ALERT_CHURN_DAYS, 7), marginDriftPercent: num(env.SMART_ALERT_MARGIN_DRIFT_PERCENT, 3) };
}

// «Câmbio» simulado: lê dois JSON do ambiente. É AQUI que se liga um fornecedor real (BCE, exchangerate.host...).
//   FX_RATES_BASELINE='{"USD":0.92,"BRL":0.17}'   FX_RATES_TODAY='{"USD":0.88,"BRL":0.17}'
export function parseRates(raw: string | undefined): Record<string, number> {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "number" && v > 0).map(([k, v]) => [k.toUpperCase(), v as number]));
  } catch {
    return {};
  }
}

export const churnMessage = (name: string, days: number) => `Atenção: o cliente ${name} não responde há ${days} dias. A probabilidade de fecho caiu.`;
export const marginMessage = (currency: string, drift: number, impact: number, base: string) =>
  `Atenção: o ${currency} caiu ${Math.abs(drift).toLocaleString("pt-PT")}% face a ${base}. Negócios em aberto nesta moeda perdem cerca de ${Math.abs(impact).toLocaleString("pt-PT")} ${base} de margem.`;
