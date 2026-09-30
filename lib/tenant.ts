import { prisma } from "@/lib/prisma";

// A organização (tenant) a que uma mensagem pertence e o que ela permite fazer.
// Tudo o que é específico de um cliente (ficha do negócio, agente ligado/desligado, subscrição) vem daqui,
// lido da base de dados a cada mensagem: nada de um cliente vive em variáveis de ambiente.

export const ACTIVE_SUBSCRIPTION = ["trialing", "active"] as const;

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

export function isSubscriptionActive(
  subStatus: string,
  trialEndsAt: Date | null,
  now = new Date(),
) {
  if (!(ACTIVE_SUBSCRIPTION as readonly string[]).includes(subStatus))
    return false;
  return !(
    subStatus === "trialing" &&
    trialEndsAt !== null &&
    trialEndsAt.getTime() < now.getTime()
  );
}

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
    ),
    agentEnabled: workspace.agentEnabled,
    knowledge: workspace.agentKnowledge?.trim()
      ? workspace.agentKnowledge
      : null,
  };
}
