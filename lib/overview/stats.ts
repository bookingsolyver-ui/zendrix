import "server-only";
import { prisma } from "@/lib/prisma";

export interface OverviewStats {
  conversations: number;
  awaitingReply: number; // conversas com mensagens por ler
  receivedThisMonth: number;
  sentThisMonth: number;
}

// Indicadores do painel: tudo real, da organização da sessão, sem números inventados.
export async function getOverviewStats(workspaceId: string): Promise<OverviewStats> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [conversations, awaitingReply, receivedThisMonth, sentThisMonth] = await Promise.all([
    prisma.conversation.count({ where: { workspaceId } }),
    prisma.conversation.count({ where: { workspaceId, unreadCount: { gt: 0 } } }),
    prisma.message.count({ where: { workspaceId, direction: "IN", createdAt: { gte: monthStart } } }),
    prisma.message.count({ where: { workspaceId, direction: "OUT", createdAt: { gte: monthStart } } }),
  ]);
  return { conversations, awaitingReply, receivedThisMonth, sentThisMonth };
}
