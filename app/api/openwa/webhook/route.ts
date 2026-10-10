import { after, NextResponse } from "next/server";
import { runAgentSafely, type AgentEvent } from "@/lib/agent";
import { isValidSignature, QR_PREFIX, webhookSecret } from "@/lib/openwa/config";
import { parseOpenWaWebhook } from "@/lib/openwa/parse";
import { mapStatus } from "@/lib/openwa/client";
import { syncStatus } from "@/lib/openwa/service";
import { drainOutbox } from "@/lib/outbox/process";
import { prisma } from "@/lib/prisma";
import { saveInboundMessage } from "@/lib/whatsapp/inbox-store";

export const maxDuration = 120; // as respostas humanizadas esperam alguns segundos entre mensagens

// Webhook ÚNICO do OpenWA para todas as sessões. Autenticação: HMAC-SHA256 do corpo (cabeçalho
// X-OpenWA-Signature: sha256=<hex>) com um segredo derivado do id da sessão. Mensagens entram pelo MESMO caminho
// que as da Meta (saveInboundMessage → agente → fila de saída), por isso Inbox, agente, agenda e seguimentos
// funcionam igual. Respostas 2xx rápidas: o OpenWA repete as entregas que falham.
export async function POST(request: Request) {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!key) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await request.text(); // a assinatura cobre os bytes exatos
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const event = parseOpenWaWebhook(payload);
  if (event.kind === "ignored") return NextResponse.json({ success: true });

  if (!isValidSignature(raw, request.headers.get("x-openwa-signature"), webhookSecret(event.sessionId, key))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  if (event.kind === "status") {
    const integration = await prisma.socialIntegration.findFirst({
      where: { platform: "WHATSAPP", providerAccountId: `${QR_PREFIX}${event.sessionId}` },
      select: { id: true, status: true },
    });
    if (integration) await syncStatus(integration.id, integration.status, mapStatus(event.status));
    return NextResponse.json({ success: true });
  }

  try {
    const saved = await saveInboundMessage(event.message);
    if (!saved) return NextResponse.json({ success: true }); // repetição ou sessão desconhecida
    // Notas de voz por QR ainda não são transcritas: o agente pede ao cliente que escreva.
    const agentEvent: AgentEvent = {
      ...saved,
      waMessageId: event.message.waMessageId,
      type: event.message.type,
      ...(event.message.type === "audio" ? { unintelligible: true } : {}),
    };
    after(async () => {
      await runAgentSafely([agentEvent]);
      await drainOutbox(60_000);
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[openwa/webhook] falhou", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
