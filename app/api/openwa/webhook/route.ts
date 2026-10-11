import { after, NextResponse } from "next/server";
import { runAgentSafely, type AgentEvent } from "@/lib/agent";
import { allowedNumbers, isNumberAllowed, isValidSignature, QR_PREFIX, webhookSecret } from "@/lib/openwa/config";
import { parseOpenWaWebhook } from "@/lib/openwa/parse";
import { mapStatus } from "@/lib/openwa/client";
import { syncStatus } from "@/lib/openwa/service";
import { drainOutbox } from "@/lib/outbox/process";
import { prisma } from "@/lib/prisma";
import { saveInboundMessage } from "@/lib/whatsapp/inbox-store";
import { processQrAudio } from "@/lib/openwa/inbound-audio";
import { downloadMessageMedia } from "@/lib/openwa/client";
import { openWaConfig } from "@/lib/openwa/config";
import { captureProof } from "@/lib/payments/proofs";
import { isProofMessageType } from "@/lib/payments/bank-format";

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

  // Modo de teste (OPENWA_ALLOWED_NUMBERS): mensagens de outros números não são guardadas nem respondidas.
  if (!isNumberAllowed(event.message.waId, allowedNumbers())) return NextResponse.json({ success: true });

  try {
    const saved = await saveInboundMessage(event.message);
    if (!saved) return NextResponse.json({ success: true }); // repetição ou sessão desconhecida
    if (event.message.type === "audio") {
      // Nota de voz: descarrega, transcreve e SÓ DEPOIS corre o agente, com o texto transcrito (ou o pedido de «escreva»,
      // se não foi possível transcrever). Tudo depois de a resposta ao OpenWA sair.
      const job = {
        workspaceId: saved.workspaceId,
        conversationId: saved.conversationId,
        sessionId: event.sessionId,
        waId: event.message.waId,
        waMessageId: event.message.waMessageId,
        mimeHint: event.media?.mimetype ?? event.message.mimeType,
        inlineBase64: event.media?.base64 ?? null,
      };
      after(async () => {
        const agentEvent = await processQrAudio(job); // nunca lança
        if (agentEvent) await runAgentSafely([agentEvent]);
        await drainOutbox(60_000);
      });
      return NextResponse.json({ success: true });
    }
    // Imagem ou documento: pode ser um comprovativo de pagamento (só conta se já enviámos os dados bancários).
    if (isProofMessageType(event.message.type)) {
      const proof = {
        workspaceId: saved.workspaceId,
        conversationId: saved.conversationId,
        waMessageId: event.message.waMessageId,
        type: event.message.type,
        getMedia: async () => {
          if (event.media?.base64) return { buffer: Buffer.from(event.media.base64, "base64"), mime: event.media.mimetype ?? "image/jpeg" };
          const cfg = openWaConfig();
          if (!cfg) return null;
          const media = await downloadMessageMedia(cfg, event.sessionId, `${event.message.waId}@c.us`, event.message.waMessageId);
          return { buffer: media.buffer, mime: media.mime ?? event.media?.mimetype ?? "image/jpeg" };
        },
      };
      after(async () => {
        await captureProof(proof).catch((err) => console.error("[openwa/proof] falhou:", err instanceof Error ? err.message : err));
      });
      return NextResponse.json({ success: true });
    }
    const agentEvent: AgentEvent = { ...saved, waMessageId: event.message.waMessageId, type: event.message.type };
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
