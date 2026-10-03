import "server-only";
import { prisma } from "@/lib/prisma";
import { LINKED_STATUSES, TOKEN_EXPIRED } from "@/lib/meta/integration-health";

export interface ConnectedChannel {
  // O id da integração (para a desligar). Não é segredo: só serve dentro da própria organização.
  id: string;
  // Fim do id da conta (não é segredo, mas não precisa de ir inteiro para o ecrã).
  idTail: string;
  active: boolean;
  // A Meta recusou o token: há que voltar a ligar.
  expired: boolean;
}

export type ChannelsStatus = Record<"WHATSAPP" | "INSTAGRAM" | "MESSENGER", ConnectedChannel[]>;

// Os canais ligados da organização, só com o que o ecrã mostra. NUNCA o token.
export async function getChannelsStatus(workspaceId: string | undefined): Promise<ChannelsStatus> {
  const status: ChannelsStatus = { WHATSAPP: [], INSTAGRAM: [], MESSENGER: [] };
  if (!workspaceId) return status;

  const rows = await prisma.socialIntegration.findMany({
    where: {
      workspaceId,
      platform: { in: ["WHATSAPP", "INSTAGRAM", "MESSENGER"] },
      status: { in: LINKED_STATUSES },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, platform: true, providerAccountId: true, status: true },
  });
  for (const row of rows) {
    if (!row.providerAccountId) continue;
    status[row.platform as keyof ChannelsStatus]?.push({
      id: row.id,
      idTail: row.providerAccountId.slice(-4),
      active: row.status === "ACTIVE",
      expired: row.status === TOKEN_EXPIRED,
    });
  }
  return status;
}
