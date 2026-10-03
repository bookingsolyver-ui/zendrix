import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trialEndDate } from "@/lib/tenant";
import { approvalRequired, initialApprovalStatus } from "@/lib/auth/approval";
import { hashInviteToken, looksLikeInviteToken } from "@/lib/team/invite-token";

interface ProvisionInput {
  authId: string;
  email: string;
  // Only a confirmed address may claim an existing row that has no authId yet.
  emailVerified: boolean;
  name?: string | null;
  workspaceName?: string | null;
  // O token do link de convite, se a pessoa veio de um: entra na organização que a convidou em vez de criar uma.
  inviteToken?: string;
  // A língua do utilizador (pt | en | es), para os e-mails que lhe enviamos.
  locale?: string;
}

class InviteGone extends Error {}

// O convite que esta pessoa pode usar para entrar numa organização existente:
//  * com o token do link: o convite tem de ser PARA este e-mail (o token prova que viu o e-mail);
//  * sem token (ex.: já tinha conta e iniciou sessão): só com o e-mail VERIFICADO, que prova ser a dona.
async function findClaimableInvite(email: string, emailVerified: boolean, inviteToken?: string) {
  const usable = { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } };
  if (inviteToken && looksLikeInviteToken(inviteToken)) {
    return prisma.teamInvite.findFirst({
      where: { tokenHash: hashInviteToken(inviteToken), email, ...usable },
      select: { id: true, workspaceId: true, role: true },
    });
  }
  if (!emailVerified) return null;
  return prisma.teamInvite.findFirst({
    where: { email, ...usable },
    orderBy: { createdAt: "desc" },
    select: { id: true, workspaceId: true, role: true },
  });
}

async function findExisting(
  authId: string,
  email: string,
  emailVerified: boolean,
) {
  // 1. Primary match: the Supabase Auth user id.
  const byAuthId = await prisma.user.findUnique({ where: { authId } });
  if (byAuthId) return byAuthId;

  // 2. Fallback: legacy rows created before authId existed, matched by email.
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (!byEmail) return null;

  if (byEmail.authId && byEmail.authId !== authId) {
    // The email belongs to a different Supabase account — never re-link it.
    throw new Error("email_linked_to_other_account");
  }
  if (!byEmail.authId) {
    if (!emailVerified) throw new Error("email_not_verified");
    return prisma.user.update({ where: { id: byEmail.id }, data: { authId } });
  }
  return byEmail;
}

// Links a Supabase Auth account to our own User row and gives it a Workspace.
// Idempotent: safe to call again on every login if a previous attempt failed halfway.
export async function provisionUser({
  authId,
  email,
  emailVerified,
  name,
  workspaceName,
  inviteToken,
  locale,
}: ProvisionInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name?.trim() || null;
  const cleanLocale = locale === "en" || locale === "es" || locale === "pt" ? locale : null;

  const existing = await findExisting(authId, normalizedEmail, emailVerified);
  if (existing) return existing;

  // Convidado: entra na organização de quem o convidou, com o papel do convite (nunca cria uma organização).
  const invite = await findClaimableInvite(normalizedEmail, emailVerified, inviteToken);
  if (invite) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Atómico: o convite só serve uma vez, mesmo com dois pedidos ao mesmo tempo.
        const claimed = await tx.teamInvite.updateMany({
          where: { id: invite.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
          data: { acceptedAt: new Date() },
        });
        if (claimed.count !== 1) throw new InviteGone();
        return tx.user.create({
          data: { authId, email: normalizedEmail, name: cleanName, workspaceId: invite.workspaceId, role: invite.role, locale: cleanLocale },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const user = await findExisting(authId, normalizedEmail, emailVerified);
        if (user) return user;
      }
      // O convite foi revogado ou usado entretanto: segue o caminho normal (organização própria).
      if (!(err instanceof InviteGone)) throw err;
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name:
            workspaceName?.trim() ||
            `${cleanName ?? normalizedEmail.split("@")[0]} workspace`,
          // Nova organização: o dono é quem a criou, em período de teste de 14 dias. O agente nasce
          // desligado e sem ficha: só responde depois de o cliente a preencher e o ligar.
          ownerEmail: normalizedEmail,
          subStatus: "trialing",
          trialEndsAt: trialEndDate(),
          // Conta nova: por aprovar pela administração (REQUIRE_ACCOUNT_APPROVAL=false aprova logo). Um convidado
          // entra numa organização que já existe e está aprovada: não passa por aqui.
          approvalStatus: initialApprovalStatus(approvalRequired(process.env.REQUIRE_ACCOUNT_APPROVAL)),
        },
      });
      return tx.user.create({
        data: {
          authId,
          email: normalizedEmail,
          name: cleanName,
          workspaceId: workspace.id,
          role: "OWNER", // quem cria a organização é o dono
          locale: cleanLocale,
        },
      });
    });
  } catch (err) {
    // Two concurrent requests for the same account: the loser reuses the winner's row.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const user = await findExisting(authId, normalizedEmail, emailVerified);
      if (user) return user;
    }
    throw err;
  }
}
