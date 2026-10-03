import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { parseMessagingEntries, parseMetaPayload } from "@/lib/validations/meta-whatsapp";
import type { PlatformName } from "@/lib/outbox/split-text";

// Meta signs every webhook POST: header `X-Hub-Signature-256: sha256=<hmac of the raw body>`,
// keyed with the app secret. Anything unsigned or mis-signed must be rejected, otherwise anyone
// could inject fake customer messages.
export function isValidSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Eventos normalizados de QUALQUER plataforma da Meta (WhatsApp, Instagram, Messenger).
// `accountId` é o id de quem recebe, tal como a Meta o envia em entry.id / metadata: WhatsApp = phone_number_id,
// Messenger = id da página, Instagram = id da conta. `waId` guarda o id do cliente na plataforma
// (número, IGSID ou PSID).
export interface InboundMessage {
  platform: PlatformName;
  accountId: string;
  waId: string;
  contactName: string | null;
  waMessageId: string;
  type: string;
  body: string;
  timestamp: Date;
  // Voice notes / audio only: what is needed to download the file from the Media API.
  mediaId: string | null;
  mimeType: string | null;
}

export interface StatusUpdate {
  platform: PlatformName;
  accountId: string;
  waMessageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  errorMessage: string | null;
}

const STATUS_MAP: Record<string, StatusUpdate["status"]> = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};

// Instagram e Messenger (entry[].messaging[]) para os mesmos eventos normalizados.
export function extractMessagingEvents(platform: "INSTAGRAM" | "MESSENGER", entries: unknown[]) {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];

  for (const change of parseMessagingEntries(entries)) {
    for (const msg of change.messages) {
      const text = msg.text?.trim();
      messages.push({
        platform,
        accountId: change.accountId,
        waId: msg.senderId,
        contactName: null, // estes webhooks não trazem o nome do cliente
        waMessageId: msg.mid,
        // Só o texto vai ao agente. Anexos (imagem, vídeo, áudio...) ficam com um marcador legível: o tipo
        // "audio" é reservado às notas de voz do WhatsApp, que têm descarga e transcrição próprias.
        type: text ? "text" : `${msg.attachmentType ?? "unknown"}_attachment`,
        body: text || `[${msg.attachmentType ?? "anexo"}]`,
        timestamp: msg.timestampMs > 0 ? new Date(msg.timestampMs) : new Date(),
        mediaId: null,
        mimeType: null,
      });
    }
    for (const st of change.statuses) {
      statuses.push({ platform, accountId: change.accountId, waMessageId: st.mid, status: st.status, errorMessage: null });
    }
  }
  return { messages, statuses };
}

// Flattens Meta's nested payload (entry[].changes[].value) into plain events. The payload comes from
// outside: lib/validations/meta-whatsapp.ts validates every element, and invalid ones are dropped.
export function extractEvents(payload: unknown) {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];

  for (const change of parseMetaPayload(payload)) {
    for (const msg of change.messages) {
      // Only text is rendered for now; other types keep a readable placeholder.
      const audio = msg.type === "audio" ? msg.audio : undefined;
      const body =
        msg.type === "text" && msg.text
          ? msg.text.body
          : audio
            ? "Mensagem de voz"
            : `[${msg.type}]`;
      messages.push({
        platform: "WHATSAPP",
        accountId: change.phoneNumberId,
        waId: msg.from,
        contactName: change.contactNames.get(msg.from) ?? null,
        waMessageId: msg.id,
        type: msg.type,
        body,
        timestamp: msg.timestamp > 0 ? new Date(msg.timestamp * 1000) : new Date(),
        mediaId: audio?.id ?? null,
        mimeType: audio?.mime_type ?? null,
      });
    }

    for (const st of change.statuses) {
      const status = STATUS_MAP[st.status];
      if (!status) continue;
      const err = st.errors[0];
      statuses.push({
        platform: "WHATSAPP",
        accountId: change.phoneNumberId,
        waMessageId: st.id,
        status,
        errorMessage: err ? (err.title ?? err.message ?? "failed").slice(0, 300) : null,
      });
    }
  }

  return { messages, statuses };
}
