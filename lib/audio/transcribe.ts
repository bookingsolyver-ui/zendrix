// Transcrição de voz (Whisper) pela Groq ou pela OpenAI: a API é a mesma (compatível com a da OpenAI),
// muda o endereço, a chave e o modelo. Recebe o áudio em memória; devolve o texto ou null.
// Nunca lança: se falhar, quem chama continua (guarda o áudio e o agente pede ao cliente que escreva).

const TIMEOUT_MS = 60_000;
const RETRY_PAUSE_MS = 2_000;
let warnedMissingKey = false;

type Provider = {
  name: "Groq" | "OpenAI";
  url: string;
  apiKey: string;
  model: string;
  billing: string;
};

// Groq se houver GROQ_API_KEY (mais rápida, e o .ogg do WhatsApp vem na lista oficial de formatos);
// senão OpenAI. STT_PROVIDER="openai" | "groq" força um dos dois.
export function sttProvider(): Provider | null {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const forced = process.env.STT_PROVIDER;

  if (groqKey && forced !== "openai") {
    return {
      name: "Groq",
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      apiKey: groqKey,
      model: process.env.GROQ_STT_MODEL || "whisper-large-v3",
      billing: "https://console.groq.com/settings/billing",
    };
  }
  if (openaiKey && forced !== "groq") {
    return {
      name: "OpenAI",
      url: "https://api.openai.com/v1/audio/transcriptions",
      apiKey: openaiKey,
      model: process.env.WHISPER_MODEL || "whisper-1",
      billing: "https://platform.openai.com/settings/organization/billing",
    };
  }
  return null;
}

const EXTENSIONS: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "audio/webm": "webm",
  "audio/wav": "wav",
};

// 429 pode ser "vá mais devagar" (passageiro) ou "sem saldo" (definitivo): distingue-se pelo código.
export function isOutOfCredit(status: number, data: { error?: { code?: string; message?: string } } | null) {
  if (status !== 429) return false;
  return data?.error?.code === "insufficient_quota" || /credit|quota|billing/i.test(String(data?.error?.message ?? ""));
}

export function audioExtension(mime: string) {
  return EXTENSIONS[mime.split(";")[0].trim().toLowerCase()] ?? "ogg";
}

export async function transcribeAudio(buffer: Buffer, mime: string): Promise<string | null> {
  const provider = sttProvider();
  if (!provider) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn("[transcribe] faltam GROQ_API_KEY e OPENAI_API_KEY; as notas de voz não são transcritas");
    }
    return null;
  }

  const baseMime = mime.split(";")[0].trim() || "audio/ogg";
  const form = new FormData();
  form.append("model", provider.model);
  form.append("language", process.env.WHISPER_LANGUAGE || "pt"); // ajuda a acertar; não impede outros idiomas de sair mal
  form.append("response_format", "json");
  form.append("file", new Blob([new Uint8Array(buffer)], { type: baseMime }), `audio.${audioExtension(baseMime)}`);

  // Erros diferentes pedem respostas diferentes:
  //  - sem crédito (429 insufficient_quota): repetir não adianta, o problema é da conta;
  //  - limite de pedidos passageiro (429) ou erro do servidor (5xx): uma repetição costuma chegar;
  //  - resto (400 formato inválido, 401 chave errada...): definitivo.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.apiKey}` }, // sem Content-Type: o fetch define o boundary
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        return text.length > 0 ? text : null; // silêncio ou ruído: não há nada para responder
      }

      // Só o motivo, nunca o áudio nem o texto.
      const reason = String(data?.error?.message ?? "").slice(0, 160);
      if (isOutOfCredit(res.status, data)) {
        console.error(
          `[transcribe] a conta da ${provider.name} está SEM CRÉDITO/QUOTA: as notas de voz não são transcritas até haver saldo (${provider.billing})`
        );
        return null;
      }
      const transient = res.status === 429 || res.status >= 500;
      console.error(`[transcribe] ${provider.name}`, res.status, reason, transient && attempt === 0 ? "(vai repetir)" : "");
      if (!transient) return null;
    } catch (err) {
      console.error("[transcribe] falhou:", err instanceof Error ? err.message : err);
      if (attempt === 1) return null;
    }
  }
  return null;
}
