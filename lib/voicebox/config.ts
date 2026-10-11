// Puro (sem servidor): configuração e pedido para um servidor Voicebox (https://voicebox.sh).
//
// A Voicebox é um servidor Python com modelos de IA locais (não corre na Vercel). O Kwanza Flow fala com uma
// instância alojada por si. Dois dialetos (VOICEBOX_API):
//   "native" (por omissão): a API da Voicebox 0.5+ (POST /generate, polling do estado, GET /audio/{id} em WAV; o
//                           perfil de voz clonado vem de VOICEBOX_PROFILE) e a conversão para Ogg/Opus é feita cá;
//   "openai": a rota compatível com a OpenAI, POST {VOICEBOX_URL}/v1/audio/speech (versões que a têm).
// A Voicebox NÃO tem autenticação própria: a chave (VOICEBOX_API_KEY) é validada pelo proxy que a protege
// (ver docs/kwanza-voicebox.md), e o Kwanza Flow envia-a em "Authorization: Bearer".

export interface VoiceboxConfig {
  baseUrl: string;
  apiKey: string | null;
  voice: string | null; // nome ou id do perfil de voz criado na Voicebox
  model: string; // motor (qwen, chatterbox, kokoro...) ou um alias OpenAI = "o motor do perfil"
  speed: number | null;
  timeoutMs: number;
  api: "native" | "openai";
  profile: string | null; // native: nome ou id do perfil de voz (ex.: "OLYVER")
  language: string; // native: código do idioma (pt)
  engine: string; // native: qwen, kokoro, chatterbox...
  modelSize: string; // native: 1.7B, 0.6B...
}

export type VoiceboxFormat = "opus" | "mp3";

type Env = Record<string, string | undefined>;

// Só https (ou http para a própria máquina): o texto das respostas vai nesta ligação.
export function parseBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
    return `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return null;
  }
}

export function voiceboxConfig(env: Env): VoiceboxConfig | null {
  const baseUrl = parseBaseUrl(env.VOICEBOX_URL);
  if (!baseUrl) return null;
  const speed = Number(env.VOICEBOX_SPEED);
  return {
    baseUrl,
    apiKey: env.VOICEBOX_API_KEY?.trim() || null,
    voice: env.VOICEBOX_VOICE?.trim() || null,
    model: env.VOICEBOX_ENGINE?.trim() || "tts-1",
    speed: speed >= 0.25 && speed <= 4 ? speed : null,
    // O modo nativo gera + espera + descarrega: dá-lhe mais tempo por omissão.
    timeoutMs: Number(env.VOICEBOX_TIMEOUT_MS) || (env.VOICEBOX_API === "openai" ? 30_000 : 45_000),
    api: env.VOICEBOX_API === "openai" ? "openai" : "native",
    profile: env.VOICEBOX_PROFILE?.trim() || env.VOICEBOX_VOICE?.trim() || null,
    language: env.VOICEBOX_LANGUAGE?.trim() || "pt",
    engine: env.VOICEBOX_ENGINE?.trim() && env.VOICEBOX_ENGINE.trim() !== "tts-1" ? env.VOICEBOX_ENGINE.trim() : "qwen",
    modelSize: env.VOICEBOX_MODEL_SIZE?.trim() || "1.7B",
  };
}

export function buildSpeechRequest(config: VoiceboxConfig, text: string, format: VoiceboxFormat) {
  return {
    url: `${config.baseUrl}/v1/audio/speech`,
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    } as Record<string, string>,
    body: JSON.stringify({
      model: config.model,
      input: text,
      response_format: format,
      ...(config.voice ? { voice: config.voice } : {}),
      ...(config.speed ? { speed: config.speed } : {}),
    }),
  };
}
