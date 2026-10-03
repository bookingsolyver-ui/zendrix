import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { LINKED_STATUSES } from "@/lib/meta/integration-health";
import type { InboundMessage, StatusUpdate } from "@/lib/whatsapp/webhook";
import type { PlatformName } from "@/lib/outbox/split-text";

// Which organization owns a Meta account: a WhatsApp phone number id, an Instagram account id or a Facebook
// page id (the `providerAccountId` of its integration for that platform).
// This is the multi-tenant router: every Meta event carries the account it is about, and that alone
// decides whose data it is. The database enforces one owner per account (unique platform + providerAccountId).
export async function findWorkspaceId(platform: PlatformName, accountId: string) {
  const integration = await prisma.socialIntegration.findFirst({
    where: {
      platform,
      providerAccountId: accountId,
      // Também com o token expirado: receber não precisa do token, e assim nenhuma mensagem do cliente se perde.
      status: { in: LINKED_STATUSES },
    },
    select: { workspaceId: true },
  });
  if (!integration) {
    // An account nobody owns (disconnected client, typo in the Meta panel...): dropped, but not silently.
    if (
      (
        await rateLimit(`unknown-account:${platform}:${accountId}`, {
          limit: 1,
          windowMs: 10 * 60 * 1000,
        })
      ).ok
    ) {
      console.warn(
        `[webhook] evento ${platform} para a conta ${accountId}, que não pertence a nenhuma organização ativa; ignorado`,
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
  const workspaceId = await findWorkspaceId(msg.platform, msg.accountId);
  if (!workspaceId) return null; // an account that is not connected to any workspace

  try {
    const conversationId = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.upsert({
        where: {
          workspaceId_platform_waId: { workspaceId, platform: msg.platform, waId: msg.waId },
        },
        create: { workspaceId, platform: msg.platform, waId: msg.waId, name: msg.contactName },
        update: msg.contactName ? { name: msg.contactName } : {},
      });
      const conversation = await tx.conversation.upsert({
        where: {
          workspaceId_contactId: { workspaceId, contactId: contact.id },
        },
        create: { workspaceId, platform: msg.platform, contactId: contact.id },
        update: {},
      });
      await tx.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          platform: msg.platform,
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
  // Um recibo de entrega só mexe em mensagens da organização dona dessa conta.
  const workspaceId = await findWorkspaceId(update.platform, update.accountId);
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
