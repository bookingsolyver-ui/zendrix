import { after, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { enqueueText } from "@/lib/outbox/enqueue";
import { drainOutbox } from "@/lib/outbox/process";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import type { ChatMessage } from "@/lib/inbox/types";
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
    // Não fala com a Meta: grava na fila de saída (scoped à organização, janela de 24 h, canal ligado) e o
    // worker envia. A mensagem aparece já na Inbox como "Na fila" e passa a "Enviada" (ou "Falhou") sozinha.
    const queued = await enqueueText({ workspaceId, conversationId, text });
    if (!queued.ok) {
      const status = queued.error === "subscription_required" ? 402 : queued.error === "window_closed" ? 409 : 404;
      return NextResponse.json({ success: false, error: queued.error }, { status });
    }
    after(() => drainOutbox());

    const saved = queued.messages[0];
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
