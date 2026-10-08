import "server-only";
import { buildSpeechRequest, voiceboxConfig, type VoiceboxFormat } from "./config";

// Cliente do servidor Voicebox: texto -> áudio (Buffer). Lança em qualquer falha; quem chama (lib/agent/voice.ts)
// decide o que fazer (responder só por texto).

export const voiceboxConfigured = () => voiceboxConfig(process.env) !== null;

export async function voiceboxSpeech(text: string, format: VoiceboxFormat): Promise<Buffer> {
  const config = voiceboxConfig(process.env);
  if (!config) throw new Error("voicebox_not_configured");
  const request = buildSpeechRequest(config, text, format);
  const res = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: request.body,
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // 401/403: o proxy recusou a chave. 5xx/502: o servidor está em baixo ou a carregar o modelo.
    throw new Error(`Voicebox ${res.status}${detail ? `: ${detail.slice(0, 150)}` : ""}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
