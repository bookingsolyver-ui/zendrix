import "server-only";
import { escapeHtml } from "@/lib/email/send";
import { hashInviteToken, looksLikeInviteToken } from "@/lib/team/invite-token";
import { prisma } from "@/lib/prisma";
import { ROLE_LABEL, type Role } from "@/lib/roles";

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

export function inviteEmail(input: { workspaceName: string; inviterName: string; role: Role; url: string }) {
  const role = ROLE_LABEL[input.role];
  const subject = `${input.inviterName} convidou-o para a equipa ${input.workspaceName} na Zentrix`;
  const text =
    `Olá!\n\n${input.inviterName} convidou-o para a equipa "${input.workspaceName}" na Zentrix, com o papel de ${role}.\n\n` +
    `Para aceitar e criar a sua conta, abra este link (válido por 7 dias):\n${input.url}\n\n` +
    `Se não estava à espera deste convite, ignore esta mensagem.`;
  const html =
    `<p>Olá!</p><p><strong>${escapeHtml(input.inviterName)}</strong> convidou-o para a equipa ` +
    `<strong>${escapeHtml(input.workspaceName)}</strong> na Zentrix, com o papel de <strong>${escapeHtml(role)}</strong>.</p>` +
    `<p><a href="${escapeHtml(input.url)}">Aceitar o convite e criar a conta</a></p>` +
    `<p style="color:#666;font-size:13px">O link é válido por 7 dias. Se não estava à espera deste convite, ignore esta mensagem.</p>`;
  return { subject, text, html };
}
