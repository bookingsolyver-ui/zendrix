import "server-only";
import { hashInviteToken, looksLikeInviteToken } from "@/lib/team/invite-token";
import { prisma } from "@/lib/prisma";

// Um convite ainda utilizável: não aceite, não revogado, não expirado.
const usable = () => ({ acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } });

// O convite deste token (com o nome da organização para o mostrar), ou null se não existe ou já não vale.
export async function findInviteByToken(token: string) {
  if (!looksLikeInviteToken(token)) return null;
  return prisma.teamInvite.findFirst({
    where: { tokenHash: hashInviteToken(token), ...usable() },
    select: {
      id: true,
      email: true,
      role: true,
      workspaceId: true,
      expiresAt: true,
      workspace: { select: { name: true } },
    },
  });
}

// Convites pendentes de uma organização (para o ecrã da equipa).
export const listPendingInvites = (workspaceId: string) =>
  prisma.teamInvite.findMany({
    where: { workspaceId, ...usable() },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true },
  });
