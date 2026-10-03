import "server-only";
import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { runAgentSafely, type AgentEvent } from "@/lib/agent";
import { META_OBJECTS, metaWebhookSchema } from "@/lib/validations/meta-whatsapp";
import { applyStatusUpdate, saveInboundMessage } from "@/lib/whatsapp/inbox-store";
import { processInboundAudio, type AudioJob } from "@/lib/whatsapp/inbound-audio";
import {
  extractEvents,
  extractMessagingEvents,
  isValidSignature,
  type InboundMessage,
  type StatusUpdate,
} from "@/lib/whatsapp/webhook";

// Webhook ÚNICO da Meta: WhatsApp, Instagram e Messenger enviam para o mesmo URL. Os endpoints
// /api/meta/webhook (novo) e /api/webhooks/whatsapp (o que já está configurado na Meta) usam este handler.

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// A Meta chama isto uma vez, ao registar o webhook no painel da app (serve para todos os produtos).
export async function handleMetaGet(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (expected && mode === "subscribe" && token && challenge && safeEqual(token, expected)) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

const objectHeadSchema = z.object({ object: z.string() });

// Mensagens dos clientes e recibos de entrega, de qualquer plataforma.
export async function handleMetaPost(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // Without the app secret the signature cannot be checked, so nothing is accepted.
    console.error("[meta/webhook] META_APP_SECRET is not set; rejecting payload");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  // The signature covers the exact bytes Meta sent, so read the raw body before parsing.
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const head = objectHeadSchema.safeParse(payload);
  if (!head.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  // Outros produtos da Meta subscritos na mesma app (permissions, user...): 200 e fora, para não reenviar.
  if (!(META_OBJECTS as readonly string[]).includes(head.data.object)) {
    return NextResponse.json({ success: true, ignored: head.data.object });
  }
  const envelope = metaWebhookSchema.safeParse(payload);
  if (!envelope.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  // Router por plataforma: cada `object` tem o seu parser; todos produzem os mesmos eventos normalizados.
  let messages: InboundMessage[];
  let statuses: StatusUpdate[];
  switch (envelope.data.object) {
    case "whatsapp_business_account":
      ({ messages, statuses } = extractEvents(payload));
      break;
    case "instagram":
      ({ messages, statuses } = extractMessagingEvents("INSTAGRAM", envelope.data.entry));
      break;
    case "page":
      ({ messages, statuses } = extractMessagingEvents("MESSENGER", envelope.data.entry));
      break;
    default: {
      const unreachable: never = envelope.data;
      return NextResponse.json({ error: "invalid_payload", detail: String(unreachable) }, { status: 400 });
    }
  }

  const freshEvents: AgentEvent[] = [];
  const audioJobs: AudioJob[] = [];

  try {
    for (const message of messages) {
      const saved = await saveInboundMessage(message);
      if (!saved) continue;
      if (message.type === "audio" && message.mediaId) {
        // Descarregar + transcrever demora: fica para depois do 200. O agente só corre quando houver texto.
        audioJobs.push({ ...saved, waMessageId: message.waMessageId, mediaId: message.mediaId });
      } else {
        freshEvents.push({ ...saved, waMessageId: message.waMessageId, type: message.type });
      }
    }
    for (const status of statuses) await applyStatusUpdate(status);
  } catch (err) {
    // A non-200 makes Meta retry; storing is idempotent, so a retry is safe.
    console.error("[meta/webhook] processing failed", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  // Messages are stored. The AI agent (off unless AGENT_ENABLED=true) runs after the 200 is sent,
  // so it can never delay Meta or affect what was just saved; it only ever logs its own errors.
  // As respostas não vão directo à Meta: ficam na fila de saída (lib/outbox).
  after(async () => {
    const events = [...freshEvents];
    // processInboundAudio nunca lança; devolve null se AUDIO_INBOUND está desligado.
    for (const job of audioJobs) {
      const event = await processInboundAudio(job);
      if (event) events.push(event);
    }
    await runAgentSafely(events);
  });

  return NextResponse.json({ success: true });
}
