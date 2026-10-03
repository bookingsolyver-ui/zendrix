import "server-only";
import { prisma } from "@/lib/prisma";

export interface ConnectedChannel {
  // Fim do id da conta (não é segredo, mas não precisa de ir inteiro para o ecrã).
  idTail: string;
  active: boolean;
}

export type ChannelsStatus = Record<"WHATSAPP" | "INSTAGRAM" | "MESSENGER", ConnectedChannel[]>;

// Os canais ligados da organização, só com o que o ecrã mostra. NUNCA o token.
export async function getChannelsStatus(workspaceId: string | undefined): Promise<ChannelsStatus> {
  const status: ChannelsStatus = { WHATSAPP: [], INSTAGRAM: [], MESSENGER: [] };
  if (!workspaceId) return status;

  const rows = await prisma.socialIntegration.findMany({
    where: { workspaceId, platform: { in: ["WHATSAPP", "INSTAGRAM", "MESSENGER"] } },
    orderBy: { createdAt: "asc" },
    select: { platform: true, providerAccountId: true, status: true },
  });
  for (const row of rows) {
    if (!row.providerAccountId) continue;
    status[row.platform as keyof ChannelsStatus]?.push({
      idTail: row.providerAccountId.slice(-4),
      active: row.status === "ACTIVE",
    });
  }
  return status;
}
