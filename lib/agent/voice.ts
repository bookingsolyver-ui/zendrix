import "server-only";
import { voiceboxConfigured, voiceboxSpeech } from "@/lib/voicebox/client";
// Text-to-speech para o agente: transforma a resposta em áudio pronto para o WhatsApp.
//
// Tudo passa por memória (Buffer): uma resposta curta dá alguns KB, não há disco nem bucket.
// Fornecedor por omissão: a Voicebox (servidor próprio, lib/voicebox); a OpenAI continua disponível com
// TTS_PROVIDER=openai. Ordem de preferência: Ogg/Opus mono (aparece como nota de voz). O contentor do "opus"
// varia entre fornecedores, por isso o ficheiro é INSPECIONADO antes de ser usado;
// se não for Ogg/Opus mono, passa a MP3 (que o WhatsApp também aceita, como ficheiro de áudio).
// Nada aqui lança erros: em qualquer falha devolve null e o agente responde por texto.

export type Speech = {
  buffer: Buffer;
  mime: "audio/ogg" | "audio/mpeg";
  filename: string;
};

type Format = "opus" | "mp3";

const TIMEOUT_MS = 30_000;
const MAX_BYTES = 16 * 1024 * 1024; // limite do WhatsApp para áudio

// Como a voz acompanha o texto. "text_then_voice" (por omissão): o texto sai logo e a nota de voz segue assim
// que a síntese acaba, em paralelo. "voice_only": só a voz (o texto só se a voz falhar).
export const voiceDelivery = () => (process.env.AGENT_VOICE_DELIVERY === "voice_only" ? "voice_only" : "text_then_voice");

export const voiceEnabled = () => process.env.AGENT_VOICE === "true";

// Modo "espelho" (por omissão): o agente responde em voz quando o cliente falou, e em texto quando
// o cliente escreveu, como faria uma pessoa. AGENT_VOICE_MODE="always" responde sempre em voz
// (as respostas longas ou com links continuam a ir por texto).
export function voiceWanted(inboundType: string) {
  if (!voiceEnabled()) return false;
  return process.env.AGENT_VOICE_MODE === "always" || inboundType === "audio";
}

const maxChars = () => Number(process.env.AGENT_VOICE_MAX_CHARS) || 500;

// ---------------------------------------------------------------- texto -> texto "falável"
export function prepareForSpeech(text: string) {
  return text
    .replace(/[\p{Extended_Pictographic}︎️‍]/gu, "") // emojis: o TTS lê-os mal
    .replace(/[*_`#>~]/g, "") // marcas de markdown
    // Moedas: um TTS soletra "Kz" e diz "R cifrão". O texto escrito (Inbox) mantém-se como está.
    .replace(/R\$\s?(\d[\d.,]*)/g, "$1 reais")
    .replace(/(\d)\s?Kz\b/g, "$1 kwanzas")
    .replace(/\bKz\b/g, "kwanzas")
    .replace(/\s?\/\s?mês\b/gi, " por mês")
    .replace(/\s+/g, " ")
    .trim();
}

// Só vale a pena falar respostas curtas e sem ligações: um link não se clica num áudio.
export function eligibleForVoice(text: string) {
  if (/https?:\/\/|www\./i.test(text)) return false;
  const spoken = prepareForSpeech(text);
  return spoken.length > 0 && spoken.length <= maxChars();
}

// ---------------------------------------------------------------- validar o ficheiro
// WhatsApp: "audio/ogg (OPUS codecs only; mono input only)". Um Ogg começa por "OggS" e a primeira
// página traz "OpusHead"; o byte 9 depois dessa marca é o número de canais.
export function isOggOpusMono(buf: Buffer) {
  if (buf.length < 64 || buf.subarray(0, 4).toString("latin1") !== "OggS") return false;
  const head = buf.subarray(0, 256).indexOf("OpusHead");
  return head !== -1 && buf[head + 9] === 1;
}

// ---------------------------------------------------------------- fornecedores
// Sem crédito/quota o fornecedor recusa TUDO até haver saldo: repetir é gastar tempo à toa.
class OutOfCreditError extends Error {}

async function readAudio(res: Response) {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 402 || ((res.status === 429 || res.status === 401) && /credit|quota|billing/i.test(detail))) {
      throw new OutOfCreditError(`TTS ${res.status}`);
    }
    throw new Error(`TTS ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeOpenAI(text: string, format: Format) {
  return readAudio(
    await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "tts-1",
        voice: process.env.OPENAI_TTS_VOICE || "nova",
        input: text,
        response_format: format,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  );
}

// TTS_PROVIDER=voicebox | openai. Sem ele: Voicebox se VOICEBOX_URL existir, senão OpenAI.
const provider = () =>
  process.env.TTS_PROVIDER === "openai" ? "openai" : process.env.TTS_PROVIDER === "voicebox" || voiceboxConfigured() ? "voicebox" : "openai";

function configured() {
  return provider() === "voicebox" ? voiceboxConfigured() : Boolean(process.env.OPENAI_API_KEY);
}

const synthesize = (text: string, format: Format) =>
  provider() === "voicebox" ? voiceboxSpeech(text, format).catch(markVoiceboxDown) : synthesizeOpenAI(text, format);

// Servidor Voicebox em baixo (rede, 5xx, a carregar o modelo): não insistir durante um minuto, para as
// respostas seguintes irem logo só por texto em vez de esperarem pelo tempo limite.
let voiceboxDownUntil = 0;
const VOICEBOX_PAUSE_MS = 60_000;
function markVoiceboxDown(err: unknown): never {
  const message = err instanceof Error ? err.message : "";
  if (!/Voicebox 4\d\d/.test(message)) voiceboxDownUntil = Date.now() + VOICEBOX_PAUSE_MS;
  throw err;
}

// ---------------------------------------------------------------- API
// Aprende, por processo, se o "opus" do fornecedor serve: falhou uma vez, passa logo a MP3.
let preferred: Format = "opus";
let warnedMissingKey = false;
let blockedUntil = 0; // sem crédito: não voltar a tentar durante uns minutos
const OUT_OF_CREDIT_PAUSE_MS = 10 * 60 * 1000;

export async function synthesizeSpeech(text: string): Promise<Speech | null> {
  if (!eligibleForVoice(text)) return null;
  if (Date.now() < blockedUntil) return null; // conta sem crédito: responde logo por texto, sem esperar
  if (provider() === "voicebox" && Date.now() < voiceboxDownUntil) return null;

  if (!configured()) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn("[voice] AGENT_VOICE=true mas falta VOICEBOX_URL (ou OPENAI_API_KEY com TTS_PROVIDER=openai); respostas por texto");
    }
    return null;
  }

  const spoken = prepareForSpeech(text);
  try {
    if (preferred === "opus") {
      const opus = await synthesize(spoken, "opus");
      if (isOggOpusMono(opus) && opus.length <= MAX_BYTES) {
        return { buffer: opus, mime: "audio/ogg", filename: "voice.ogg" };
      }
      preferred = "mp3";
      console.warn("[voice] o 'opus' do fornecedor não é Ogg/Opus mono; a usar MP3 daqui para a frente");
    }

    const mp3 = await synthesize(spoken, "mp3");
    if (mp3.length < 512 || mp3.length > MAX_BYTES) return null;
    return { buffer: mp3, mime: "audio/mpeg", filename: "voice.mp3" };
  } catch (err) {
    if (err instanceof OutOfCreditError) {
      blockedUntil = Date.now() + OUT_OF_CREDIT_PAUSE_MS;
      console.error(
        `[voice] a conta do fornecedor de TTS (${provider()}) está SEM CRÉDITO/QUOTA: as respostas vão por texto durante 10 minutos. Adicione saldo ou use a Voicebox (VOICEBOX_URL).`
      );
      return null;
    }
    console.error("[voice] TTS falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

// Só para testes.
export const __resetVoiceState = () => {
  preferred = "opus";
  warnedMissingKey = false;
  blockedUntil = 0;
  voiceboxDownUntil = 0;
};
