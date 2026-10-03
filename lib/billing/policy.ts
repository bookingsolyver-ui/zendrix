// Puro (sem servidor): a regra do paywall, num só sítio. Quem pode usar o produto?
//
//   active                      -> sim
//   trialing, dentro do prazo   -> sim (14 dias grátis, sem cartão)
//   trialing, prazo acabado     -> NÃO (trial_expired)   · sem data de fim também não: nunca é "grátis para sempre"
//   past_due (inclui unpaid e paused, ver lib/stripe/webhook.ts) -> NÃO, de imediato, sem período de graça
//   canceled (ou estado desconhecido) -> NÃO
//
// O estado vem da base de dados, que só o webhook do Stripe (assinatura verificada) atualiza.

export type AccessReason = "trial_expired" | "past_due" | "canceled" | "blocked";
export type Access = { active: true } | { active: false; reason: AccessReason };

export function evaluateAccess(subStatus: string, trialEndsAt: Date | null, now = new Date(), blocked = false): Access {
  // Uma organização suspensa pela administração da plataforma não tem acesso, tenha o plano que tiver.
  if (blocked) return { active: false, reason: "blocked" };
  switch (subStatus) {
    case "active":
      return { active: true };
    case "trialing":
      return trialEndsAt !== null && trialEndsAt.getTime() > now.getTime()
        ? { active: true }
        : { active: false, reason: "trial_expired" };
    case "past_due":
      return { active: false, reason: "past_due" };
    default:
      return { active: false, reason: "canceled" };
  }
}

export const isSubscriptionActive = (subStatus: string, trialEndsAt: Date | null, now = new Date(), blocked = false) =>
  evaluateAccess(subStatus, trialEndsAt, now, blocked).active;

// O que dizer ao utilizador, por motivo (usado pelo aviso da página de faturação).
export const PAYWALL_MESSAGE: Record<AccessReason, string> = {
  trial_expired: "O seu teste grátis terminou. Ative o plano para voltar a usar a Inbox, responder aos clientes e ligar canais.",
  past_due: "O último pagamento falhou. Regularize o pagamento para reativar a conta: até lá a Inbox e os envios estão bloqueados.",
  canceled: "A subscrição está cancelada. Subscreva novamente para reativar a Inbox, os envios e a ligação de canais.",
  blocked: "A conta foi suspensa pela administração da plataforma. Contacte o suporte para a reativar.",
};
