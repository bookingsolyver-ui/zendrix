import type { InboundMessage } from "@/lib/whatsapp/webhook";
import { QR_PREFIX } from "./config.ts";

// Normaliza o webhook do OpenWA ({ event, sessionId, data }) para os eventos que o Kwanza Flow já entende. Puro.
// Ignora: mensagens nossas (fromMe), grupos, estados/difusão, endereços @lid (sem número) e tipos sem utilidade.

export type OpenWaEvent =
  | { kind: "status"; sessionId: string; status: string }
  | { kind: "message"; sessionId: string; message: InboundMessage }
  | { kind: "ignored" };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

const PLACEHOLDER: Record<string, string> = {
  audio: "Mensagem de voz",
  voice: "Mensagem de voz",
  image: "[imagem]",
  video: "[vídeo]",
  document: "[documento]",
  sticker: "[sticker]",
  location: "[localização]",
};

export function parseOpenWaWebhook(payload: unknown): OpenWaEvent {
  if (!isRecord(payload)) return { kind: "ignored" };
  const event = str(payload.event);
  const sessionId = str(payload.sessionId);
  const data = payload.data;
  if (!event || !sessionId || !isRecord(data)) return { kind: "ignored" };

  if (event === "session.status") {
    const status = str(data.status);
    return status ? { kind: "status", sessionId, status } : { kind: "ignored" };
  }
  if (event !== "message.received") return { kind: "ignored" };

  if (data.fromMe === true || data.isGroup === true || data.isStatusBroadcast === true) return { kind: "ignored" };
  const id = str(data.id);
  const chat = str(data.chatId) ?? str(data.from);
  if (!id || !chat || !chat.endsWith("@c.us")) return { kind: "ignored" }; // grupos, status@broadcast, @lid
  const waId = chat.split("@")[0].replace(/\D/g, "");
  if (!waId) return { kind: "ignored" };

  const type = str(data.type) ?? "text";
  const text = str(data.body);
  const isMediaOnly = type !== "text" && type in PLACEHOLDER;
  if (type !== "text" && !isMediaOnly) return { kind: "ignored" }; // reações, chamadas, revogadas...
  const body = type === "text" ? text : (PLACEHOLDER[type] ?? text);
  if (!body) return { kind: "ignored" };

  const seconds = Number(data.timestamp);
  return {
    kind: "message",
    sessionId,
    message: {
      platform: "WHATSAPP",
      accountId: `${QR_PREFIX}${sessionId}`,
      waId,
      contactName: str(data.pushName) ?? str(data.notifyName),
      waMessageId: id,
      type: type === "voice" ? "audio" : type,
      body,
      timestamp: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date(),
      mediaId: null,
      mimeType: null,
    },
  };
}
