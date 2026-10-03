import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { REPLY_WINDOW_MS } from "@/lib/inbox/types";
import { markIntegrationExpired } from "@/lib/meta/integration-health";
import { enqueueText } from "@/lib/outbox/enqueue";

export type SendResult = { ok: true } | { ok: false; error: string };

// Responde a uma conversa com texto, em QUALQUER plataforma (WhatsApp, Instagram, Messenger). NÃO fala com a
// Meta: grava a mensagem na fila de saída (lib/outbox) e devolve ok assim que ficou gravada. O worker envia
// depois, com ritmo controlado e tentativas; quem chama (a IA) deve chamar drainOutbox() a seguir para o
// envio não esperar pelo cron. Mesmas regras de antes: da organização, janela de 24 h, canal ligado.
export async function sendTextInConversation(input: {
  workspaceId: string;
  conversationId: string;
  text: string;
}): Promise<SendResult> {
  const queued = await enqueueText(input);
  return queued.ok ? { ok: true } : { ok: false, error: queued.error };
}

// ---------------------------------------------------------------- áudio (nota de voz)
// EXCEÇÃO À FILA: o áudio é enviado directamente (o ficheiro não cabe num payload de fila e o chamador precisa
// de saber já se falhou, para responder por texto, que SIM passa pela fila). Está desligado por defeito
// (AGENT_VOICE) e é só WhatsApp.
// Upload do ficheiro à Media API da Meta (multipart, direto da memória) e envio da mensagem
// `type: "audio"`. O texto falado fica guardado como corpo da mensagem para a equipa o ler na Inbox.
//
// Devolve { ok: false } para QUALQUER falha antes de a Meta entregar a mensagem, para o chamador
// poder responder por texto. Se a Meta entregou e só a gravação local falha, LANÇA o erro:
// aí já não se pode reenviar por texto (o cliente receberia a resposta duas vezes).
export async function sendAudioInConversation(input: {
  workspaceId: string;
  conversationId: string;
  audio: { buffer: Buffer; mime: string; filename: string };
  transcript: string;
}): Promise<SendResult> {
  const { workspaceId, conversationId, audio, transcript } = input;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { platform: true, contact: { select: { waId: true } } },
  });
  if (!conversation) return { ok: false, error: "not_found" };
  // A nota de voz é só do WhatsApp (upload à Media API do WhatsApp). Nas outras o chamador responde por texto.
  if (conversation.platform !== "WHATSAPP") return { ok: false, error: "unsupported_platform" };

  const lastInbound = await prisma.message.findFirst({
    where: { conversationId, direction: "IN" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!lastInbound || Date.now() - lastInbound.createdAt.getTime() > REPLY_WINDOW_MS) {
    return { ok: false, error: "window_closed" };
  }

  const integration = await prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, accessToken: true, providerAccountId: true },
  });
  if (!integration?.providerAccountId) return { ok: false, error: "no_integration" };

  let accessToken: string;
  try {
    accessToken = decryptSecret(integration.accessToken);
  } catch {
    return { ok: false, error: "integration_unreadable" };
  }

  const graph = `https://graph.facebook.com/v17.0/${integration.providerAccountId}`;

  // 1) upload
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", audio.mime);
  form.append("file", new Blob([new Uint8Array(audio.buffer)], { type: audio.mime }), audio.filename);
  const upload = await fetch(`${graph}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }, // sem Content-Type: o fetch define o boundary
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  const uploaded = await upload.json().catch(() => null);
  if (!upload.ok || typeof uploaded?.id !== "string") {
    if (upload.status === 401 || uploaded?.error?.code === 190) {
      await markIntegrationExpired(integration.id);
      return { ok: false, error: "token_expired" };
    }
    return { ok: false, error: "media_upload_failed" };
  }

  // 2) enviar
  const res = await fetch(`${graph}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contact.waId,
      type: "audio",
      audio: { id: uploaded.id },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 || data?.error?.code === 190) {
      await markIntegrationExpired(integration.id);
      return { ok: false, error: "token_expired" };
    }
    if (data?.error?.code === 131047) return { ok: false, error: "window_closed" };
    return { ok: false, error: "meta_error" };
  }

  // 3) gravar (a Meta já entregou: se isto falhar, o erro sobe e NÃO há reenvio por texto)
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        workspaceId,
        conversationId,
        direction: "OUT",
        type: "audio",
        body: transcript,
        status: "SENT",
        waMessageId: data?.messages?.[0]?.id ?? null,
        createdAt: now,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, lastMessagePreview: `🔊 ${transcript}`.slice(0, 120) },
    });
  });
  return { ok: true };
}
