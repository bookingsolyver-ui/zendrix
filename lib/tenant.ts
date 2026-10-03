import "server-only";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive, restrictionOf } from "@/lib/billing/policy";

// A organização (tenant) a que uma mensagem pertence e o que ela permite fazer.
// Tudo o que é específico de um cliente (ficha do negócio, agente ligado/desligado, subscrição) vem daqui,
// lido da base de dados a cada mensagem: nada de um cliente vive em variáveis de ambiente.

// Toda a organização nova começa com um teste grátis deste tamanho.
export const TRIAL_DAYS = 14;

export function trialEndDate(from = new Date()) {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export interface TenantContext {
  workspaceId: string;
  name: string;
  subStatus: string;
  // Subscrição em dia (trialing/active) e, se for teste, ainda dentro do prazo.
  subscriptionActive: boolean;
  agentEnabled: boolean;
  // Ficha do negócio desta organização; null se ainda não a escreveu.
  knowledge: string | null;
}

// A regra do paywall vive em lib/billing/policy.ts (pura e testada); reexporta-se para quem já a importa daqui.
export { isSubscriptionActive };

export async function loadTenant(
  workspaceId: string,
): Promise<TenantContext | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      subStatus: true,
      trialEndsAt: true,
      agentEnabled: true,
      agentKnowledge: true,
      blockedAt: true,
      approvalStatus: true,
    },
  });
  if (!workspace) return null;
  return {
    workspaceId: workspace.id,
    name: workspace.name,
    subStatus: workspace.subStatus,
    subscriptionActive: isSubscriptionActive(
      workspace.subStatus,
      workspace.trialEndsAt,
      new Date(),
      restrictionOf(workspace),
    ),
    agentEnabled: workspace.agentEnabled,
    knowledge: workspace.agentKnowledge?.trim()
      ? workspace.agentKnowledge
      : null,
  };
}
