import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trialEndDate } from "@/lib/tenant";

interface ProvisionInput {
  authId: string;
  email: string;
  // Only a confirmed address may claim an existing row that has no authId yet.
  emailVerified: boolean;
  name?: string | null;
  workspaceName?: string | null;
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
}: ProvisionInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name?.trim() || null;

  const existing = await findExisting(authId, normalizedEmail, emailVerified);
  if (existing) return existing;

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
        },
      });
      return tx.user.create({
        data: {
          authId,
          email: normalizedEmail,
          name: cleanName,
          workspaceId: workspace.id,
          role: "OWNER", // quem cria a organização é o dono
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
