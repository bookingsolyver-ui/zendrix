import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { InboundMessage, StatusUpdate } from "@/lib/whatsapp/webhook";

// Which organization owns a WhatsApp phone number id (the `providerAccountId` of its integration).
// This is the multi-tenant router: every Meta event carries the phone number it is about, and that alone
// decides whose data it is. The database enforces one owner per number (unique platform + providerAccountId).
export async function findWorkspaceId(phoneNumberId: string) {
  const integration = await prisma.socialIntegration.findFirst({
    where: {
      platform: "WHATSAPP",
      providerAccountId: phoneNumberId,
      status: "ACTIVE",
    },
    select: { workspaceId: true },
  });
  if (!integration) {
    // A number nobody owns (disconnected client, typo in the Meta panel...): dropped, but not silently.
    if (
      rateLimit(`unknown-number:${phoneNumberId}`, {
        limit: 1,
        windowMs: 10 * 60 * 1000,
      }).ok
    ) {
      console.warn(
        `[webhook] evento para o número ${phoneNumberId}, que não pertence a nenhuma organização ativa; ignorado`,
      );
    }
    return null;
  }
  return integration.workspaceId;
}

// Stores one inbound message. Idempotent: Meta retries deliveries, and the unique
// `waMessageId` makes a repeated message a no-op.
// Returns where it was stored, or null when nothing new was stored (unknown number or a retry).
export async function saveInboundMessage(
  msg: InboundMessage,
): Promise<{ workspaceId: string; conversationId: string } | null> {
  const workspaceId = await findWorkspaceId(msg.phoneNumberId);
  if (!workspaceId) return null; // a number that is not connected to any workspace

  try {
    const conversationId = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.upsert({
        where: { workspaceId_waId: { workspaceId, waId: msg.waId } },
        create: { workspaceId, waId: msg.waId, name: msg.contactName },
        update: msg.contactName ? { name: msg.contactName } : {},
      });
      const conversation = await tx.conversation.upsert({
        where: {
          workspaceId_contactId: { workspaceId, contactId: contact.id },
        },
        create: { workspaceId, contactId: contact.id },
        update: {},
      });
      await tx.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          direction: "IN",
          type: msg.type,
          body: msg.body,
          status: "RECEIVED",
          waMessageId: msg.waMessageId,
          createdAt: msg.timestamp,
        },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: msg.timestamp,
          lastMessagePreview: msg.body.slice(0, 120),
          unreadCount: { increment: 1 },
        },
      });
      return conversation.id;
    });
    return { workspaceId, conversationId };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return null; // already stored (webhook retry)
    }
    throw err;
  }
}

// Delivery receipts for messages we sent. Never downgrades READ back to DELIVERED, since
// Meta does not guarantee the order of status events.
const RANK: Record<string, number> = {
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: 4,
};

export async function applyStatusUpdate(update: StatusUpdate) {
  // Um recibo de entrega só mexe em mensagens da organização dona desse número.
  const workspaceId = await findWorkspaceId(update.phoneNumberId);
  if (!workspaceId) return false;

  const message = await prisma.message.findUnique({
    where: { waMessageId: update.waMessageId },
    select: { id: true, status: true, direction: true, workspaceId: true },
  });
  if (
    !message ||
    message.direction !== "OUT" ||
    message.workspaceId !== workspaceId
  )
    return false;
  if (
    (RANK[message.status] ?? 0) >= RANK[update.status] &&
    update.status !== "FAILED"
  )
    return false;

  await prisma.message.update({
    where: { id: message.id },
    data: { status: update.status, errorMessage: update.errorMessage },
  });
  return true;
}
