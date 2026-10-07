import { after, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { enqueueTemplate } from "@/lib/outbox/enqueue-template";
import { drainOutbox } from "@/lib/outbox/process";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import type { ChatMessage } from "@/lib/inbox/types";

const schema = z.object({
  conversationId: z.string().min(1).max(64),
  templateId: z.string().min(1).max(64),
  params: z.array(z.string().max(200)).max(20).default([]),
});

const STATUS: Record<string, number> = { subscription_required: 402, not_found: 404, template_not_found: 404, invalid_params: 400, unsupported_platform: 409, template_not_approved: 409, template_unsupported: 409, no_integration: 409 };

// Envia um modelo aprovado pela Meta numa conversa de WhatsApp (funciona fora da janela de 24 h).
// Sessão do browser OU chave de API, como /api/whatsapp/send. Passa pela mesma fila de saída.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  let who;
  try {
    who = await requireRole(["OWNER", "MANAGER", "STAFF"], request);
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  const limit = await rateLimit(`wa-send-tpl:${who.rateKey}`, { limit: 30, windowMs: 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

  try {
    const queued = await enqueueTemplate({ workspaceId: who.workspaceId, ...parsed.data });
    if (!queued.ok) return NextResponse.json({ success: false, error: queued.error }, { status: STATUS[queued.error] ?? 404 });
    after(() => drainOutbox());

    const saved = queued.message;
    const message: ChatMessage = { id: saved.id, direction: "OUT", type: saved.type, body: saved.body, status: saved.status, errorMessage: null, createdAt: saved.createdAt.toISOString(), mediaUrl: null };
    return NextResponse.json({ success: true, message });
  } catch (err) {
    console.error("[whatsapp/send-template] failed", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
