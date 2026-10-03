import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { stripeDelete, StripeNotConfiguredError } from "@/lib/stripe/client";
import { deleteWorkspaceMedia } from "@/lib/storage/media";
import { deleteAuthUsers } from "@/lib/supabase/admin";

export const newDeletionCode = () => randomBytes(9).toString("base64url"); // 12 caracteres

export type DeleteAccountResult =
  | { ok: true; code: string }
  | { ok: false; error: "stripe_cancel_failed" | "not_found" };

// Elimina uma organização e TUDO o que lhe pertence: subscrição (cancelada de imediato), ficheiros de áudio,
// canais e credenciais, utilizadores, conversas, mensagens, contactos, chaves de API e convites, e as contas
// de Auth dos membros. Fica só um registo anónimo (DataDeletionRequest) de que foi feito.
//
// A ordem protege o cliente: primeiro cancela-se a subscrição (se falhar, para TUDO: não se apaga a conta e
// deixa-se a cobrança a correr); só depois se apaga.
export async function deleteAccount(workspaceId: string): Promise<DeleteAccountResult> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { stripeSubscriptionId: true, users: { select: { authId: true } } },
  });
  if (!workspace) return { ok: false, error: "not_found" };

  if (workspace.stripeSubscriptionId) {
    try {
      await stripeDelete(`/subscriptions/${encodeURIComponent(workspace.stripeSubscriptionId)}`);
    } catch (err) {
      console.error("[account/delete] não conseguiu cancelar a subscrição:", err instanceof StripeNotConfiguredError ? err.message : "stripe");
      return { ok: false, error: "stripe_cancel_failed" };
    }
  }

  const files = await deleteWorkspaceMedia(workspaceId);

  // Tudo ou nada. Estas tabelas não têm remoção em cascata a partir da organização; as outras (contactos,
  // conversas, mensagens, chaves, convites, fila de saída) caem com a organização.
  const [, integrations, users] = await prisma.$transaction([
    prisma.offeredSlot.deleteMany({ where: { workspaceId } }),
    prisma.socialIntegration.deleteMany({ where: { workspaceId } }),
    prisma.user.deleteMany({ where: { workspaceId } }),
    prisma.workspace.delete({ where: { id: workspaceId } }),
  ]);

  const authIds = workspace.users.flatMap((user) => (user.authId ? [user.authId] : []));
  const authLeft = await deleteAuthUsers(authIds);

  const code = newDeletionCode();
  await prisma.dataDeletionRequest.create({
    data: {
      code,
      source: "account",
      status: "completed",
      completedAt: new Date(),
      detail: `conta eliminada: ${users.count} utilizador(es), ${integrations.count} canal(is), ${files} ficheiro(s)${authLeft ? `; ${authLeft} conta(s) de Auth por apagar` : ""}`,
    },
  });
  return { ok: true, code };
}
