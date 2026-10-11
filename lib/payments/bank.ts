import "server-only";
import { prisma } from "@/lib/prisma";
import { BANK_MARKER, normalizeIban, type BankInput } from "./bank-format";

// Dados bancários da organização (BankDetails). Nunca saem para o browser de quem não gere pagamentos.
export const BANK_SENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export async function loadBankDetails(workspaceId: string) {
  return prisma.bankDetails.findUnique({ where: { workspaceId } });
}

export async function saveBankDetails(workspaceId: string, input: BankInput) {
  const data = {
    bankName: input.bankName.trim(),
    holderName: input.holderName.trim(),
    iban: normalizeIban(input.iban),
    nib: input.nib?.replace(/\s/g, "") || null,
    instructions: input.instructions?.trim() || null,
  };
  return prisma.bankDetails.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: data });
}

// Já se enviaram os dados bancários a esta conversa? (a mensagem leva a marca BANK_MARKER)
export async function bankDetailsSentSince(conversationId: string, since: Date): Promise<boolean> {
  const sent = await prisma.message.findFirst({
    where: { conversationId, direction: "OUT", body: { startsWith: BANK_MARKER }, createdAt: { gte: since }, status: { not: "FAILED" } },
    select: { id: true },
  });
  return sent !== null;
}
