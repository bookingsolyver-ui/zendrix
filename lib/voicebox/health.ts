import "server-only";
import { voiceboxConfig } from "./config.ts";

// Teste de saúde do Voicebox: nunca lança e nunca demora mais de 4 s. «Acessível» = o servidor respondeu com qualquer
// código abaixo de 500 (um 404/401 na raiz é normal: o proxy só deixa passar a rota de síntese). 5xx, rede e timeout =
// inacessível. Não gasta síntese nem envia texto nenhum.
export interface VoiceboxHealth {
  configured: boolean;
  reachable: boolean;
  ms: number | null;
  detail: string | null;
}

const TIMEOUT_MS = 4_000;

export async function voiceboxHealth(fetchImpl: typeof fetch = fetch, env: Record<string, string | undefined> = process.env): Promise<VoiceboxHealth> {
  const config = voiceboxConfig(env);
  if (!config) return { configured: false, reachable: false, ms: null, detail: "VOICEBOX_URL não definido" };
  const started = Date.now();
  try {
    const res = await fetchImpl(config.baseUrl, { method: "GET", signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual" });
    const ms = Date.now() - started;
    return res.status < 500
      ? { configured: true, reachable: true, ms, detail: null }
      : { configured: true, reachable: false, ms, detail: `HTTP ${res.status}` };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { configured: true, reachable: false, ms: null, detail: timeout ? "sem resposta em 4 s" : "sem ligação ao servidor" };
  }
}
