import "server-only";
import { openWaConfig } from "./config.ts";

// Teste de saúde do servidor OpenWA: nunca lança, no máximo 5 s por pedido. Separa «o servidor responde» de «a chave
// é aceite» (um servidor de pé com a chave errada é outro problema: 401).
export interface OpenWaHealth {
  configured: boolean;
  reachable: boolean;
  authOk: boolean | null;
  ms: number | null;
  detail: string | null;
}

const TIMEOUT_MS = 5_000;

export async function openWaHealth(fetchImpl: typeof fetch = fetch, env: Record<string, string | undefined> = process.env): Promise<OpenWaHealth> {
  const cfg = openWaConfig(env);
  if (!cfg) return { configured: false, reachable: false, authOk: null, ms: null, detail: "OPENWA_URL/OPENWA_API_KEY não definidos" };
  const started = Date.now();
  try {
    const health = await fetchImpl(`${cfg.baseUrl}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const ms = Date.now() - started;
    if (!health.ok) return { configured: true, reachable: false, authOk: null, ms, detail: `HTTP ${health.status}` };
    const auth = await fetchImpl(`${cfg.baseUrl}/api/sessions`, { headers: { "X-API-Key": cfg.apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return { configured: true, reachable: true, authOk: auth.ok, ms, detail: auth.ok ? null : `chave recusada (HTTP ${auth.status})` };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { configured: true, reachable: false, authOk: null, ms: null, detail: timeout ? "sem resposta em 5 s" : "sem ligação ao servidor" };
  }
}
