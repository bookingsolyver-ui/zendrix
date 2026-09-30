import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InboundMessage, StatusUpdate } from "@/lib/whatsapp/webhook";

// Which workspace owns a WhatsApp phone number id (the `providerAccountId` of its integration).
async function findWorkspaceId(phoneNumberId: string) {
  const integration = await prisma.socialIntegration.findFirst({
    where: { platform: "WHATSAPP", providerAccountId: phoneNumberId, status: "ACTIVE" },
    select: { workspaceId: true },
  });
  return integration?.workspaceId ?? null;
}

// Stores one inbound message. Idempotent: Meta retries deliveries, and the unique
// `waMessageId` makes a repeated message a no-op.
// Returns where it was stored, or null when nothing new was stored (unknown number or a retry).
export async function saveInboundMessage(
  msg: InboundMessage
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
        where: { workspaceId_contactId: { workspaceId, contactId: contact.id } },
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
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return null; // already stored (webhook retry)
    }
    throw err;
  }
}

// Delivery receipts for messages we sent. Never downgrades READ back to DELIVERED, since
// Meta does not guarantee the order of status events.
const RANK: Record<string, number> = { SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };

export async function applyStatusUpdate(update: StatusUpdate) {
  const message = await prisma.message.findUnique({
    where: { waMessageId: update.waMessageId },
    select: { id: true, status: true, direction: true },
  });
  if (!message || message.direction !== "OUT") return false;
  if ((RANK[message.status] ?? 0) >= RANK[update.status] && update.status !== "FAILED") return false;

  await prisma.message.update({
    where: { id: message.id },
    data: { status: update.status, errorMessage: update.errorMessage },
  });
  return true;
}
