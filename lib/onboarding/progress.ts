import "server-only";
import { loadBusinessState } from "@/lib/agent/business";
import { hasMinimumProfile } from "@/lib/agent/profile";
import { prisma } from "@/lib/prisma";
import { buildSetupProgress, type SetupProgress } from "@/lib/onboarding/steps";

// O estado real do onboarding de uma organização, lido da base de dados (não de um "visto" guardado): se o
// cliente desligar o canal ou apagar a ficha, o passo volta a ficar por fazer.
export async function getSetupProgress(workspaceId: string): Promise<SetupProgress> {
  const [channels, state] = await Promise.all([
    prisma.socialIntegration.count({
      where: { workspaceId, platform: { in: ["WHATSAPP", "INSTAGRAM", "MESSENGER"] }, status: "ACTIVE" },
    }),
    loadBusinessState(workspaceId),
  ]);
  return buildSetupProgress({
    channelConnected: channels > 0,
    profileComplete: Boolean(state && hasMinimumProfile(state.profile) && state.compiled.trim()),
    agentOn: Boolean(state?.agentEnabled),
  });
}
