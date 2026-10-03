import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { REPLY_WINDOW_MS, type ChatMessage } from "@/lib/inbox/types";
import { sendTextSchema } from "@/lib/validations/whatsapp-send";

// Sends a free-text WhatsApp message in an existing conversation (Meta Cloud API).
// Aceita a sessão do browser OU uma chave de API (cabeçalho x-api-key): qualquer papel pode enviar.
export async function POST(request: Request) {
  let workspaceId: string;
  let rateKey: string;
  try {
    const who = await requireRole(["OWNER", "MANAGER", "STAFF"], request);
    workspaceId = who.workspaceId;
    rateKey = who.rateKey;
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  const limit = await rateLimit(`wa-send:${rateKey}`, { limit: 60, windowMs: 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = sendTextSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
  }
  const { conversationId, text } = parsed.data;

  try {
    // Scoped to the caller's workspace: a conversation id from another workspace is a 404.
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      select: { id: true, contact: { select: { waId: true } } },
    });
    if (!conversation) {
      return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
    }

    // Free text is only allowed within 24h of the customer's last message.
    const lastInbound = await prisma.message.findFirst({
      where: { conversationId, direction: "IN" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!lastInbound || Date.now() - lastInbound.createdAt.getTime() > REPLY_WINDOW_MS) {
      return NextResponse.json({ success: false, error: "window_closed" }, { status: 409 });
    }

    const integration = await prisma.socialIntegration.findFirst({
      where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { accessToken: true, providerAccountId: true },
    });
    if (!integration?.providerAccountId) {
      return NextResponse.json({ success: false, error: "no_integration" }, { status: 404 });
    }

    let accessToken: string;
    try {
      accessToken = decryptSecret(integration.accessToken);
    } catch (err) {
      console.error("[whatsapp/send] could not decrypt integration token", err);
      return NextResponse.json({ success: false, error: "integration_unreadable" }, { status: 500 });
    }

    const res = await fetch(
      `https://graph.facebook.com/v17.0/${integration.providerAccountId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: conversation.contact.waId,
          type: "text",
          text: { body: text },
        }),
      }
    );
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("[whatsapp/send] Meta API error", res.status, data?.error?.code, data?.error?.message);
      if (res.status === 401 || data?.error?.code === 190) {
        return NextResponse.json({ success: false, error: "token_expired" }, { status: 502 });
      }
      if (data?.error?.code === 131047) {
        return NextResponse.json({ success: false, error: "window_closed" }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: "meta_error" }, { status: 502 });
    }

    const waMessageId: string | undefined = data?.messages?.[0]?.id;
    const now = new Date();
    const saved = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          workspaceId,
          conversationId,
          direction: "OUT",
          type: "text",
          body: text,
          status: "SENT",
          waMessageId: waMessageId ?? null,
          createdAt: now,
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now, lastMessagePreview: text.slice(0, 120) },
      });
      return message;
    });

    const message: ChatMessage = {
      id: saved.id,
      direction: "OUT",
      type: saved.type,
      body: saved.body,
      status: saved.status,
      errorMessage: null,
      createdAt: saved.createdAt.toISOString(),
      mediaUrl: null,
    };
    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error("[whatsapp/send] failed", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
