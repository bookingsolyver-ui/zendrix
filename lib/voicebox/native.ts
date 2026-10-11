// Cliente PURO (sem servidor-only: testável com um servidor falso) da API nativa da Voicebox 0.5:
//   1. POST /generate {profile_id, text, language, engine, model_size}  -> { id, status }
//   2. enquanto status != "completed": GET /history/{id} (o mesmo estado do SSE de /generate/{id}/status, em JSON simples)
//   3. GET /audio/{id} -> WAV
// Tudo com um prazo total (config.timeoutMs): passado o prazo cancela a geração e lança. Erros em texto estável:
//   "Voicebox timeout" · "Voicebox unreachable" · "Voicebox <código>" · "Voicebox generation failed" · "Voicebox profile not found".
import type { VoiceboxConfig } from "./config.ts";

type Fetch = typeof fetch;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const headers = (config: VoiceboxConfig, json = false): Record<string, string> => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
});

class Deadline {
  private end: number;
  constructor(ms: number) {
    this.end = Date.now() + ms;
  }
  left() {
    return this.end - Date.now();
  }
  signal() {
    const left = this.left();
    if (left <= 0) throw new Error("Voicebox timeout");
    return AbortSignal.timeout(left);
  }
}

async function call(fetchImpl: Fetch, deadline: Deadline, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(url, { ...init, signal: deadline.signal() });
  } catch (err) {
    if (err instanceof Error && err.message === "Voicebox timeout") throw err;
    const name = err instanceof Error ? err.name : "";
    throw new Error(name === "TimeoutError" || name === "AbortError" ? "Voicebox timeout" : "Voicebox unreachable");
  }
}

async function json(res: Response): Promise<unknown> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Voicebox ${res.status}${detail ? `: ${detail.slice(0, 150)}` : ""}`);
  }
  return res.json().catch(() => null);
}

// O nome do perfil ("OLYVER") -> o id. Guardado em memória 10 min (o perfil raramente muda).
const profileCache = new Map<string, { id: string; at: number }>();
const PROFILE_TTL_MS = 10 * 60 * 1000;

export async function resolveProfileId(config: VoiceboxConfig, fetchImpl: Fetch, deadline: Deadline): Promise<string> {
  const wanted = config.profile?.trim();
  if (wanted && UUID.test(wanted)) return wanted;
  const key = `${config.baseUrl}|${(wanted ?? "").toLowerCase()}`;
  const cached = profileCache.get(key);
  if (cached && Date.now() - cached.at < PROFILE_TTL_MS) return cached.id;

  const data = await json(await call(fetchImpl, deadline, `${config.baseUrl}/profiles`, { headers: headers(config) }));
  const list = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.profiles) ? data.profiles : [];
  const profiles = list.filter(isRecord);
  const match = wanted ? profiles.find((p) => typeof p.name === "string" && p.name.toLowerCase() === wanted.toLowerCase()) : profiles.length === 1 ? profiles[0] : undefined;
  const id = match && typeof match.id === "string" ? match.id : null;
  if (!id) throw new Error("Voicebox profile not found");
  profileCache.set(key, { id, at: Date.now() });
  return id;
}

export const __resetProfileCache = () => profileCache.clear();

export async function generateWav(config: VoiceboxConfig, text: string, fetchImpl: Fetch = fetch): Promise<Buffer> {
  const deadline = new Deadline(config.timeoutMs);
  const profileId = await resolveProfileId(config, fetchImpl, deadline);

  const started = await json(
    await call(fetchImpl, deadline, `${config.baseUrl}/generate`, {
      method: "POST",
      headers: headers(config, true),
      body: JSON.stringify({ profile_id: profileId, text, language: config.language, engine: config.engine, model_size: config.modelSize, normalize: true }),
    }),
  );
  const id = isRecord(started) && typeof started.id === "string" ? started.id : null;
  if (!id) throw new Error("Voicebox generation failed");
  let status = isRecord(started) && typeof started.status === "string" ? started.status : "generating";

  // Polling inteligente: começa rápido (frases curtas ficam prontas depressa) e abranda até 1,5 s.
  let pause = 400;
  try {
    while (status !== "completed") {
      if (status === "failed" || status === "cancelled" || status === "error") throw new Error("Voicebox generation failed");
      if (deadline.left() <= pause) throw new Error("Voicebox timeout");
      await sleep(pause);
      pause = Math.min(Math.round(pause * 1.5), 1_500);
      const state = await json(await call(fetchImpl, deadline, `${config.baseUrl}/history/${encodeURIComponent(id)}`, { headers: headers(config) }));
      status = isRecord(state) && typeof state.status === "string" ? state.status : status;
    }
  } catch (err) {
    // Desistiu (prazo ou falha): pede ao servidor que pare de gastar GPU. Melhor esforço, sem esperar.
    void fetchImpl(`${config.baseUrl}/generate/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: headers(config), signal: AbortSignal.timeout(3_000) }).catch(() => {});
    throw err;
  }

  const res = await call(fetchImpl, deadline, `${config.baseUrl}/audio/${encodeURIComponent(id)}`, { headers: headers(config) });
  if (!res.ok) throw new Error(`Voicebox ${res.status}`);
  const wav = Buffer.from(await res.arrayBuffer());
  if (wav.length < 100) throw new Error("Voicebox generation failed");
  return wav;
}
