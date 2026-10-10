import "server-only";
import type { OpenWaConfig } from "./config";

// Cliente HTTP do OpenWA (autenticação: cabeçalho X-API-Key). Caminhos conferidos com o openapi.json do OpenWA
// 0.24. Nunca regista corpos de resposta (podem trazer QR Codes ou números).

export class OpenWaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OpenWaError";
  }
  // rede, 429 e 5xx: pode valer a pena repetir. 4xx: não.
  get transient() {
    return this.status === 0 || this.status >= 500 || this.status === 429;
  }
}

const TIMEOUT_MS = 25_000;

async function call(cfg: OpenWaConfig, method: string, path: string, body?: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api${path}`, {
      method,
      headers: { "X-API-Key": cfg.apiKey, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new OpenWaError(0, "openwa_unreachable");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new OpenWaError(res.status, `openwa_${res.status}`);
  return json;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

// Estados do OpenWA -> os que a UI mostra.
export type ConnState = "open" | "connecting" | "close";
export function mapStatus(status: string | null): ConnState {
  if (status === "ready") return "open";
  if (status === "created" || status === "initializing" || status === "qr_ready" || status === "authenticating") return "connecting";
  return "close"; // disconnected | failed | action_required | desconhecido
}

export async function createSession(cfg: OpenWaConfig, name: string): Promise<{ id: string }> {
  const json = await call(cfg, "POST", "/sessions", { name });
  const id = isRecord(json) ? str(json.id) : null;
  if (!id) throw new OpenWaError(502, "openwa_bad_response");
  return { id };
}

export const startSession = (cfg: OpenWaConfig, id: string) =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/start`);

export async function sessionState(cfg: OpenWaConfig, id: string): Promise<ConnState> {
  const json = await call(cfg, "GET", `/sessions/${encodeURIComponent(id)}`);
  return mapStatus(isRecord(json) ? str(json.status) : null);
}

// QR atual como data URL (null enquanto o OpenWA ainda não o gerou: responde 4xx até o estado ser qr_ready).
export async function getQr(cfg: OpenWaConfig, id: string): Promise<string | null> {
  try {
    const json = await call(cfg, "GET", `/sessions/${encodeURIComponent(id)}/qr`);
    return isRecord(json) ? str(json.qrCode) : null;
  } catch (err) {
    if (err instanceof OpenWaError && err.status >= 400 && err.status < 500) return null;
    throw err;
  }
}

export const createWebhook = (cfg: OpenWaConfig, id: string, input: { url: string; secret: string }) =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/webhooks`, {
    url: input.url,
    events: ["message.received", "session.status"],
    secret: input.secret,
  });

export async function deleteSession(cfg: OpenWaConfig, id: string) {
  // logout primeiro (desliga o aparelho no telemóvel); ambos best-effort, só o delete conta.
  await call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/logout`).catch(() => {});
  await call(cfg, "DELETE", `/sessions/${encodeURIComponent(id)}`);
}

export const chatId = (number: string) => `${number}@c.us`;

// Indicador de presença: "typing" (a escrever) ou "recording" (a gravar áudio). Falhar aqui nunca impede o envio.
export const setPresence = (cfg: OpenWaConfig, id: string, number: string, state: "typing" | "recording" | "paused") =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/chats/typing`, { chatId: chatId(number), state }).catch(() => {});

export async function sendText(cfg: OpenWaConfig, id: string, input: { number: string; text: string }): Promise<string | null> {
  const json = await call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/messages/send-text`, {
    chatId: chatId(input.number),
    text: input.text,
    linkPreview: false,
  });
  return isRecord(json) ? str(json.messageId) : null;
}

// Nota de voz (ptt = bolha de microfone). O áudio deve ser Ogg/Opus.
export async function sendVoice(
  cfg: OpenWaConfig,
  id: string,
  input: { number: string; base64: string; mimetype: string },
): Promise<string | null> {
  const json = await call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/messages/send-audio`, {
    chatId: chatId(input.number),
    base64: input.base64,
    mimetype: input.mimetype,
    ptt: true,
  });
  return isRecord(json) ? str(json.messageId) : null;
}
