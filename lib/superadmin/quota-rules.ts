// Regras da quota diária. Puro (sem servidor): testável.
export const DEFAULT_AI_CALLS_PER_DAY = 500;
export const dayKey = (now: Date) => now.toISOString().slice(0, 10);

export function dailyLimit(override: number | null | undefined, env: string | undefined): number {
  if (override && override > 0) return override;
  const n = Number(env);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_AI_CALLS_PER_DAY;
}

export const isOverQuota = (usedAfterThisCall: number, limit: number) => usedAfterThisCall > limit;

export const upsellText = (workspaceName: string, used: number, limit: number) =>
  `A organização «${workspaceName}» atingiu o limite diário de IA (${used}/${limit}). Está a usar o modo de resposta fixa. Boa candidata a um plano superior ou a um limite próprio.`;
