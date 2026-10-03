import "server-only";
import { prisma } from "@/lib/prisma";
import { isSubscriptionActive } from "@/lib/tenant";
import {
  compileKnowledge,
  emptyProfile,
  hasMinimumProfile,
  parseProfile,
  type BusinessProfile,
} from "@/lib/agent/profile";

// Estado da ficha do negócio de UMA organização, tal como o ecrã e a API o mostram.

export interface BusinessState {
  profile: BusinessProfile;
  // A ficha foi escrita como texto livre antes de existir este formulário: vem na "descrição", sem perder nada.
  legacy: boolean;
  agentEnabled: boolean;
  subscription: { status: string; trialEndsAt: string | null; active: boolean };
  // Exatamente o que o agente lê a seguir a guardar.
  compiled: string;
  // Pode o agente responder agora? (ligado + subscrição em dia + ficha mínima)
  agentRuns: boolean;
}

export async function loadBusinessState(
  workspaceId: string,
): Promise<BusinessState | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      agentProfile: true,
      agentKnowledge: true,
      agentEnabled: true,
      subStatus: true,
      trialEndsAt: true,
    },
  });
  if (!workspace) return null;

  let profile: BusinessProfile;
  let legacy = false;
  const stored = workspace.agentProfile
    ? parseProfile(workspace.agentProfile)
    : null;
  if (stored?.ok) {
    profile = stored.profile;
  } else if (workspace.agentKnowledge?.trim()) {
    legacy = true;
    profile = {
      ...emptyProfile(),
      businessName: workspace.name,
      description: workspace.agentKnowledge.trim(),
    };
  } else {
    profile = { ...emptyProfile(), businessName: workspace.name };
  }

  const active = isSubscriptionActive(
    workspace.subStatus,
    workspace.trialEndsAt,
  );
  return {
    profile,
    legacy,
    agentEnabled: workspace.agentEnabled,
    subscription: {
      status: workspace.subStatus,
      trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
      active,
    },
    compiled: legacy
      ? (workspace.agentKnowledge ?? "")
      : compileKnowledge(profile),
    agentRuns:
      workspace.agentEnabled &&
      active &&
      Boolean(workspace.agentKnowledge?.trim()) &&
      hasMinimumProfile(profile),
  };
}
