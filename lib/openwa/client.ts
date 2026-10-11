import "server-only";
import type { OpenWaConfig } from "./config";
import { extractSessionArray } from "./parse-sessions";

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

async function call(
  cfg: OpenWaConfig,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = TIMEOUT_MS,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api${path}`, {
      method,
      headers: {
        "X-API-Key": cfg.apiKey,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new OpenWaError(0, "openwa_unreachable");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new OpenWaError(res.status, `openwa_${res.status}`);
  return json;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

// Estados do OpenWA -> os que a UI mostra.
export type ConnState = "open" | "connecting" | "close";
export function mapStatus(status: string | null): ConnState {
  if (status === "ready") return "open";
  if (
    status === "created" ||
    status === "initializing" ||
    status === "qr_ready" ||
    status === "authenticating"
  )
    return "connecting";
  return "close"; // disconnected | failed | action_required | desconhecido
}

export async function createSession(
  cfg: OpenWaConfig,
  name: string,
): Promise<{ id: string }> {
  const json = await call(cfg, "POST", "/sessions", { name });
  const id = isRecord(json) ? str(json.id) : null;
  if (!id) throw new OpenWaError(502, "openwa_bad_response");
  return { id };
}

export const startSession = (cfg: OpenWaConfig, id: string) =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/start`);

export async function sessionState(
  cfg: OpenWaConfig,
  id: string,
  timeoutMs = TIMEOUT_MS,
): Promise<ConnState> {
  const json = await call(
    cfg,
    "GET",
    `/sessions/${encodeURIComponent(id)}`,
    undefined,
    timeoutMs,
  );
  return mapStatus(isRecord(json) ? str(json.status) : null);
}

// QR atual como data URL (null enquanto o OpenWA ainda não o gerou: responde 4xx até o estado ser qr_ready).
export async function getQr(
  cfg: OpenWaConfig,
  id: string,
): Promise<string | null> {
  try {
    const json = await call(
      cfg,
      "GET",
      `/sessions/${encodeURIComponent(id)}/qr`,
    );
    return isRecord(json) ? str(json.qrCode) : null;
  } catch (err) {
    if (err instanceof OpenWaError && err.status >= 400 && err.status < 500)
      return null;
    throw err;
  }
}

export const createWebhook = (
  cfg: OpenWaConfig,
  id: string,
  input: { url: string; secret: string },
) =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/webhooks`, {
    url: input.url,
    events: ["message.received", "session.status"],
    secret: input.secret,
  });

export async function deleteSession(cfg: OpenWaConfig, id: string) {
  // logout primeiro (desliga o aparelho no telemóvel); ambos best-effort, só o delete conta.
  await call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/logout`).catch(
    () => {},
  );
  await call(cfg, "DELETE", `/sessions/${encodeURIComponent(id)}`);
}

export const chatId = (number: string) => `${number}@c.us`;

// Indicador de presença: "typing" (a escrever) ou "recording" (a gravar áudio). Falhar aqui nunca impede o envio.
export const setPresence = (
  cfg: OpenWaConfig,
  id: string,
  number: string,
  state: "typing" | "recording" | "paused",
) =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/chats/typing`, {
    chatId: chatId(number),
    state,
  }).catch(() => {});

export async function sendText(
  cfg: OpenWaConfig,
  id: string,
  input: { number: string; text: string },
): Promise<string | null> {
  const json = await call(
    cfg,
    "POST",
    `/sessions/${encodeURIComponent(id)}/messages/send-text`,
    {
      chatId: chatId(input.number),
      text: input.text,
      linkPreview: false,
    },
  );
  return isRecord(json) ? str(json.messageId) : null;
}

// Nota de voz. Ogg/Opus mono vai como PTT (bolha de microfone com forma de onda); qualquer outro formato (MP3 de
// recurso) vai como ficheiro de áudio normal, porque o WhatsApp recusa PTT que não seja Opus.
export async function sendVoice(
  cfg: OpenWaConfig,
  id: string,
  input: { number: string; base64: string; mimetype: string },
): Promise<string | null> {
  const ogg = input.mimetype.toLowerCase().startsWith("audio/ogg");
  const json = await call(
    cfg,
    "POST",
    `/sessions/${encodeURIComponent(id)}/messages/send-audio`,
    {
      chatId: chatId(input.number),
      base64: input.base64,
      mimetype: ogg ? "audio/ogg; codecs=opus" : input.mimetype,
      ptt: ogg,
    },
  );
  return isRecord(json) ? str(json.messageId) : null;
}

// Descarrega os bytes de uma mensagem com média (nota de voz...). O OpenWA guarda o média das mensagens recebidas; pode
// demorar um instante a estar disponível depois do webhook, por isso um 404 repete-se (3 tentativas, ~1,5 s entre elas).
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // o limite do Whisper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function downloadMessageMedia(
  cfg: OpenWaConfig,
  sessionId: string,
  chatId: string,
  messageId: string,
): Promise<{ buffer: Buffer; mime: string | null }> {
  const path = `/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}/media`;
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/api${path}`, {
        headers: { "X-API-Key": cfg.apiKey },
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new OpenWaError(0, "openwa_unreachable");
    }
    if (res.status === 404 && attempt < 3) {
      await sleep(1_500);
      continue;
    }
    if (!res.ok) throw new OpenWaError(res.status, `openwa_${res.status}`);
    const declared = Number(res.headers.get("content-length"));
    if (declared > MAX_MEDIA_BYTES)
      throw new OpenWaError(413, "media_too_large");
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES)
      throw new OpenWaError(413, "media_invalid");
    const type =
      res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ??
      null;
    return {
      buffer,
      mime: type && type !== "application/octet-stream" ? type : null,
    };
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Gestão por tenant (session-manager.ts). Acrescentado sem tocar no que existe.

export interface OpenWaSessionInfo {
  id: string;
  name: string;
  status: string | null;
  createdAt: string | null;
}

// Todas as sessões do servidor, com o formato da resposta auto-detetado. NUNCA lança: em qualquer falha
// (rede, timeout, HTTP != 200, JSON inválido, formato desconhecido) regista o motivo e devolve null, para o cron
// continuar. O corpo registado é limitado a 250 caracteres e nunca inclui a chave.
export async function listSessions(
  cfg: OpenWaConfig,
  timeoutMs = 20_000,
): Promise<OpenWaSessionInfo[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let status = 0;
  let raw = "";
  try {
    const res = await fetch(`${cfg.baseUrl}/api/sessions`, {
      method: "GET",
      headers: { "X-API-Key": cfg.apiKey, Accept: "application/json" },
      signal: controller.signal,
    });
    status = res.status;
    raw = await res.text();
    if (status !== 200) {
      console.error("[openwa/list-sessions-error]", {
        status,
        bodyRaw: raw.slice(0, 250),
      });
      return null;
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      console.error("[openwa/list-sessions-error]", {
        status,
        reason: "invalid_json",
        bodyRaw: raw.slice(0, 250),
      });
      return null;
    }
    const rows = extractSessionArray(json);
    if (!rows) {
      console.error("[openwa/list-sessions-error]", {
        status,
        reason: "unknown_shape",
        bodyRaw: raw.slice(0, 250),
      });
      return null;
    }
    const out: OpenWaSessionInfo[] = [];
    for (const row of rows) {
      if (!isRecord(row)) continue;
      const id = str(row.id) ?? str(row.sessionId);
      const name = str(row.name) ?? str(row.sessionName);
      if (id && name) {
        out.push({
          id,
          name,
          status: str(row.status) ?? str(row.state),
          createdAt: str(row.createdAt) ?? str(row.created_at),
        });
      }
    }
    return out;
  } catch (err) {
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError");
    console.error("[openwa/list-sessions-error]", {
      status,
      reason: aborted ? `timeout_${timeoutMs}ms` : "network",
      bodyRaw: raw.slice(0, 250),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Mata o motor de uma sessão encravada (SIGKILL) e arruma-a. Best-effort: serve antes de apagar uma sessão presa.
export const forceKillSession = (cfg: OpenWaConfig, id: string) =>
  call(cfg, "POST", `/sessions/${encodeURIComponent(id)}/force-kill`);
