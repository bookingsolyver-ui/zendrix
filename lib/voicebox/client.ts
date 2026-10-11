import "server-only";
import { convertAudio } from "@/lib/audio/transcode";
import { buildSpeechRequest, voiceboxConfig, type VoiceboxFormat } from "./config";
import { generateWav } from "./native";

// Cliente do servidor Voicebox: texto -> áudio (Buffer). Lança em qualquer falha; quem chama (lib/agent/voice.ts)
// decide o que fazer (responder só por texto).

export const voiceboxConfigured = () => voiceboxConfig(process.env) !== null;

// Falhas distinguidas pelo texto (quem chama só precisa de saber que FALHOU e se vale a pena insistir já):
//   "Voicebox timeout"       o servidor não respondeu a tempo
//   "Voicebox unreachable"   sem ligação (DNS, servidor desligado, rede)
//   "Voicebox <código>"      o servidor respondeu com erro (401/403: chave recusada · 5xx: em baixo ou a carregar)
//   "Voicebox generation failed" / "profile not found" / "conversion failed"  (API nativa)
export async function voiceboxSpeech(text: string, format: VoiceboxFormat): Promise<Buffer> {
  const config = voiceboxConfig(process.env);
  if (!config) throw new Error("voicebox_not_configured");
  // API nativa (Voicebox 0.5+): gera em WAV e converte aqui para Ogg/Opus (nota de voz) ou MP3. Qualquer falha: texto.
  if (config.api === "native") {
    const wav = await generateWav(config, text);
    try {
      return await convertAudio(wav, format);
    } catch (err) {
      throw new Error(`Voicebox conversion failed: ${err instanceof Error ? err.message.slice(0, 80) : "unknown"}`);
    }
  }
  const request = buildSpeechRequest(config, text, format);
  try {
    const res = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(config.timeoutMs), // cobre também a leitura do áudio, não só os cabeçalhos
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Voicebox ${res.status}${detail ? `: ${detail.slice(0, 150)}` : ""}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Voicebox ")) throw err;
    const name = err instanceof Error ? err.name : "";
    throw new Error(name === "TimeoutError" || name === "AbortError" ? "Voicebox timeout" : "Voicebox unreachable");
  }
}
