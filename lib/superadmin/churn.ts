// «Churn risk»: organizações vivas que não entram há mais de X dias. Puro (sem servidor): testável.
export const CHURN_DAYS = 7;
const DAY = 86_400_000;

export interface ChurnInput {
  lastLogin: Date | null;
  createdAt: Date;
  subStatus: string;
  blocked: boolean;
}

// Organizações com menos de X dias não contam (ainda não deu tempo de «deixar de entrar»). Só quem está a pagar ou em teste.
export function isChurnRisk(t: ChurnInput, now: Date, days = CHURN_DAYS): boolean {
  if (t.blocked || !["active", "trialing"].includes(t.subStatus)) return false;
  if (now.getTime() - t.createdAt.getTime() < days * DAY) return false;
  return !t.lastLogin || now.getTime() - t.lastLogin.getTime() > days * DAY;
}

export const daysSinceLogin = (lastLogin: Date | null, now: Date): number | null => (lastLogin ? Math.floor((now.getTime() - lastLogin.getTime()) / DAY) : null);
