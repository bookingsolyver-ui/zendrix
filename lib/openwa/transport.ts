import "server-only";
import type { MetaFailure } from "@/lib/meta/errors";
import { openWaConfig, sessionOf } from "./config";
import { OpenWaError, sendText, sendVoice, setPresence } from "./client";
import { betweenMessagesMs, recordingMs, typingMs } from "./humanize";

// Envio pelo canal QR, com humanização: "a escrever…"/"a gravar áudio…" durante um tempo proporcional ao texto,
// e uma pausa aleatória entre mensagens seguidas ao mesmo cliente.

export type QrSendResult =
  | { ok: true; externalId: string | null }
  | { ok: false; failure: MetaFailure; detail: string };

// Última mensagem enviada a cada destinatário NESTA instância. As partes de uma resposta saem em série na mesma
// execução da fila, por isso a memória local chega para as espaçar; se a instância mudar, só se perde uma
// pausa (nunca uma mensagem).
const lastSentAt = new Map<string, number>();
const BURST_WINDOW_MS = 15_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pauseIfFollowUp(key: string) {
  const last = lastSentAt.get(key);
  if (last && Date.now() - last < BURST_WINDOW_MS) await sleep(betweenMessagesMs());
  if (lastSentAt.size > 500) lastSentAt.clear();
}

function toFailure(err: unknown): QrSendResult {
  if (err instanceof OpenWaError) {
    // 401/403/404: a chave ou a sessão deixaram de existir. Marca a integração (o painel pede para voltar a ligar).
    if ([401, 403, 404].includes(err.status)) {
      return { ok: false, failure: { kind: "permanent", reason: "token_expired" }, detail: err.message };
    }
    return { ok: false, failure: { kind: err.transient ? "transient" : "permanent", reason: err.message }, detail: err.message };
  }
  return { ok: false, failure: { kind: "transient", reason: "network" }, detail: "unknown" };
}

const notConfigured: QrSendResult = { ok: false, failure: { kind: "permanent", reason: "qr_not_configured" }, detail: "OPENWA_*" };

export async function sendQrText(accountId: string, to: string, text: string): Promise<QrSendResult> {
  const cfg = openWaConfig();
  if (!cfg) return notConfigured;
  const session = sessionOf(accountId);
  try {
    await pauseIfFollowUp(`${accountId}|${to}`);
    await setPresence(cfg, session, to, "typing");
    await sleep(typingMs(text));
    const id = await sendText(cfg, session, { number: to, text });
    lastSentAt.set(`${accountId}|${to}`, Date.now());
    return { ok: true, externalId: id };
  } catch (err) {
    await setPresence(cfg, session, to, "paused");
    return toFailure(err);
  }
}

export async function sendQrVoice(
  accountId: string,
  to: string,
  audio: { buffer: Buffer; mime: string },
  transcript: string,
): Promise<QrSendResult> {
  const cfg = openWaConfig();
  if (!cfg) return notConfigured;
  const session = sessionOf(accountId);
  try {
    await pauseIfFollowUp(`${accountId}|${to}`);
    await setPresence(cfg, session, to, "recording");
    await sleep(recordingMs(transcript));
    const id = await sendVoice(cfg, session, { number: to, base64: audio.buffer.toString("base64"), mimetype: audio.mime });
    lastSentAt.set(`${accountId}|${to}`, Date.now());
    return { ok: true, externalId: id };
  } catch (err) {
    await setPresence(cfg, session, to, "paused");
    return toFailure(err);
  }
}
