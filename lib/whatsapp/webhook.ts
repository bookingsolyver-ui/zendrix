import { createHmac, timingSafeEqual } from "node:crypto";

// Meta signs every webhook POST: header `X-Hub-Signature-256: sha256=<hmac of the raw body>`,
// keyed with the app secret. Anything unsigned or mis-signed must be rejected, otherwise anyone
// could inject fake customer messages.
export function isValidSignature(rawBody: string, header: string | null, appSecret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export interface InboundMessage {
  phoneNumberId: string;
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
  phoneNumberId: string;
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

// The payload comes from outside: every field is type-checked where it is read.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

// Flattens Meta's nested payload (entry[].changes[].value) into plain events.
export function extractEvents(payload: unknown) {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];
  const entries: Json[] = Array.isArray((payload as Json)?.entry) ? (payload as Json).entry : [];

  for (const entry of entries) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== "messages") continue;
      const value: Json = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (typeof phoneNumberId !== "string") continue;

      const names = new Map<string, string>();
      for (const contact of Array.isArray(value.contacts) ? value.contacts : []) {
        if (typeof contact?.wa_id === "string" && typeof contact?.profile?.name === "string") {
          names.set(contact.wa_id, contact.profile.name);
        }
      }

      for (const msg of Array.isArray(value.messages) ? value.messages : []) {
        if (typeof msg?.id !== "string" || typeof msg?.from !== "string") continue;
        const type = typeof msg.type === "string" ? msg.type : "unknown";
        // Only text is rendered for now; other types keep a readable placeholder.
        const isAudio = type === "audio" && typeof msg.audio?.id === "string";
        const body =
          type === "text" && typeof msg.text?.body === "string"
            ? msg.text.body
            : isAudio
              ? "Mensagem de voz"
              : `[${type}]`;
        const seconds = Number(msg.timestamp);
        messages.push({
          phoneNumberId,
          waId: msg.from,
          contactName: names.get(msg.from) ?? null,
          waMessageId: msg.id,
          type,
          body,
          timestamp: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date(),
          mediaId: isAudio ? msg.audio.id : null,
          mimeType: isAudio && typeof msg.audio.mime_type === "string" ? msg.audio.mime_type : null,
        });
      }

      for (const st of Array.isArray(value.statuses) ? value.statuses : []) {
        const status = STATUS_MAP[st?.status];
        if (typeof st?.id !== "string" || !status) continue;
        const err = Array.isArray(st.errors) ? st.errors[0] : null;
        statuses.push({
          phoneNumberId,
          waMessageId: st.id,
          status,
          errorMessage: err ? String(err.title ?? err.message ?? "failed").slice(0, 300) : null,
        });
      }
    }
  }

  return { messages, statuses };
}
