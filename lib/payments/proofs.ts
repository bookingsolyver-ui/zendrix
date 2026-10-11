import "server-only";
import { Prisma } from "@prisma/client";
import { AuditLedger } from "@/lib/audit/ledger";
import { drainOutbox } from "@/lib/outbox/process";
import { prisma } from "@/lib/prisma";
import { mediaPathFor, storageConfigured, uploadMedia } from "@/lib/storage/media";
import { sendTextInConversation } from "@/lib/whatsapp/cloud";
import { BANK_SENT_WINDOW_MS, bankDetailsSentSince } from "./bank";
import { isBankMessage, isProofMessageType, parseOrder, PAYMENT_APPROVED_TEXT, paymentRejectedText, PROOF_RECEIVED_TEXT } from "./bank-format";

// Comprovativos de pagamento por transferência. Fluxo:
//   1. captureProof: o cliente envia uma imagem/PDF DEPOIS de lhe termos mandado os dados bancários -> guarda o ficheiro,
//      regista o comprovativo (PENDING), pausa a IA nesta conversa e responde-lhe «Recebemos o seu comprovativo…».
//   2. decideProof: um gestor aprova ou rejeita no painel -> o estado muda (UMA só vez, mesmo com dois cliques), o cliente
//      recebe a confirmação (ou o pedido de novo comprovativo), a IA volta a falar e fica tudo no livro de auditoria.

export interface ProofMedia {
  buffer: Buffer;
  mime: string;
}

export async function captureProof(input: {
  workspaceId: string;
  conversationId: string;
  waMessageId: string;
  type: string;
  getMedia: () => Promise<ProofMedia | null>;
}): Promise<"captured" | "ignored"> {
  const { workspaceId, conversationId, waMessageId, type } = input;
  if (!isProofMessageType(type)) return "ignored";

  // Só conta como comprovativo se a organização tem dados bancários E já os enviámos a este cliente.
  const bank = await prisma.bankDetails.findUnique({ where: { workspaceId }, select: { id: true } });
  if (!bank) return "ignored";
  if (!(await bankDetailsSentSince(conversationId, new Date(Date.now() - BANK_SENT_WINDOW_MS)))) return "ignored";

  const message = await prisma.message.findUnique({ where: { waMessageId }, select: { id: true, conversation: { select: { contactId: true } } } });
  if (!message) return "ignored";

  // O que se está a pagar: lê-se da última mensagem de dados bancários enviada.
  const lastBank = await prisma.message.findFirst({
    where: { conversationId, direction: "OUT", body: { startsWith: "💳" } },
    orderBy: { createdAt: "desc" },
    select: { body: true },
  });
  const order = lastBank && isBankMessage(lastBank.body) ? parseOrder(lastBank.body) : { itemName: null, amountLabel: null };

  // O ficheiro: se não for possível obter ou guardar, o comprovativo regista-se na mesma (o gestor vê-o no telemóvel).
  let mediaPath: string | null = null;
  let mimeType: string | null = null;
  try {
    const media = await input.getMedia();
    if (media && media.buffer.length > 0) {
      mimeType = media.mime;
      const path = mediaPathFor(workspaceId, conversationId, waMessageId, media.mime);
      if (storageConfigured() && (await uploadMedia(path, media.buffer, media.mime))) {
        mediaPath = path;
        await prisma.message.update({ where: { id: message.id }, data: { mediaPath: path } });
      }
    }
  } catch (err) {
    console.error("[payments/proof] não foi possível guardar o ficheiro:", err instanceof Error ? err.message : "unknown");
  }

  try {
    await prisma.paymentProof.create({
      data: { workspaceId, conversationId, contactId: message.conversation.contactId, messageId: message.id, mediaPath, mimeType, ...order },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "ignored"; // já registado (reenvio do webhook)
    throw err;
  }

  // A IA fica calada enquanto a pessoa valida (volta ao decidir). A resposta ao cliente é fixa.
  await prisma.conversation.updateMany({ where: { id: conversationId, workspaceId }, data: { isPaused: true } });
  const sent = await sendTextInConversation({ workspaceId, conversationId, text: PROOF_RECEIVED_TEXT });
  if (sent.ok) await drainOutbox();
  return "captured";
}

export type DecisionResult =
  | { ok: true; status: "APPROVED" | "REJECTED"; notified: boolean }
  | { ok: false; error: "not_found" | "not_pending" };

export async function decideProof(input: {
  workspaceId: string;
  proofId: string;
  action: "approve" | "reject";
  note?: string | null;
  actor: { userId: string | null; ip: string | null };
}): Promise<DecisionResult> {
  const { workspaceId, proofId, action, actor } = input;
  const status = action === "approve" ? "APPROVED" : "REJECTED";
  const note = action === "reject" ? input.note?.trim().slice(0, 200) || null : null;

  // Atómico: só passa de PENDING uma vez (dois cliques, ou dois gestores ao mesmo tempo, nunca decidem duas vezes).
  const claimed = await prisma.paymentProof.updateMany({
    where: { id: proofId, workspaceId, status: "PENDING" },
    data: { status, note, decidedBy: actor.userId, decidedAt: new Date() },
  });
  if (claimed.count === 0) {
    const exists = await prisma.paymentProof.count({ where: { id: proofId, workspaceId } });
    return { ok: false, error: exists ? "not_pending" : "not_found" };
  }

  const proof = await prisma.paymentProof.findUniqueOrThrow({ where: { id: proofId } });
  // Dinheiro: o registo de auditoria é síncrono (uma linha perdida não é aceitável).
  await AuditLedger.record(
    { workspaceId, actorId: actor.userId, ip: actor.ip },
    { entityType: "PaymentProof", entityId: proofId, action: "UPDATE" },
    { previous: { status: "PENDING" }, next: { status, note, itemName: proof.itemName, amountLabel: proof.amountLabel } },
    "sync",
  );

  if (action === "approve") {
    await prisma.contact.updateMany({ where: { id: proof.contactId, workspaceId }, data: { leadStage: "WON" } });
  }
  // A IA volta a responder nesta conversa.
  await prisma.conversation.updateMany({ where: { id: proof.conversationId, workspaceId }, data: { isPaused: false } });

  const sent = await sendTextInConversation({
    workspaceId,
    conversationId: proof.conversationId,
    text: action === "approve" ? PAYMENT_APPROVED_TEXT : paymentRejectedText(note),
  });
  if (sent.ok) await drainOutbox();
  return { ok: true, status, notified: sent.ok };
}
