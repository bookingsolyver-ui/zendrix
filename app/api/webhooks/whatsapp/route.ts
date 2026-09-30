import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { extractEvents, isValidSignature } from "@/lib/whatsapp/webhook";
import { applyStatusUpdate, saveInboundMessage } from "@/lib/whatsapp/inbox-store";
import { runAgentSafely, type AgentEvent } from "@/lib/agent";
import { processInboundAudio, type AudioJob } from "@/lib/whatsapp/inbound-audio";

// O agente corre depois de responder à Meta (after): modelo + voz + upload podem levar dezenas de
// segundos, e em alojamento serverless esse trabalho conta para a duração máxima da função.
export const maxDuration = 60;

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Meta calls this once when the webhook is registered in the app dashboard.
export async function GET(request: Request) {
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

// Incoming customer messages and delivery receipts.
export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    // Without the app secret the signature cannot be checked, so nothing is accepted.
    console.error("[webhooks/whatsapp] META_APP_SECRET is not set; rejecting payload");
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

  const { messages, statuses } = extractEvents(payload);

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
    console.error("[webhooks/whatsapp] processing failed", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  // Messages are stored. The AI agent (off unless AGENT_ENABLED=true) runs after the 200 is sent,
  // so it can never delay Meta or affect what was just saved; it only ever logs its own errors.
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
