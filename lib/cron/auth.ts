import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Autenticação dos endpoints de cron. O workflow do GitHub (e a Vercel) enviam `Authorization: Bearer <CRON_SECRET>`.
// null = o segredo não está configurado (o endpoint responde 503); true/false = credenciais certas/erradas.
//
// Tolerâncias (a causa mais comum de um 401 «sem razão» é um segredo igual com um espaço ou uma mudança de linha
// no fim, ao colar na Vercel ou no GitHub): o segredo e o token recebido são aparados, e «Bearer» aceita-se em
// qualquer capitalização. O que NÃO se tolera: um segredo diferente.
export type CronAuthFailure = "missing_header" | "wrong_scheme" | "secret_mismatch";

export interface CronAuthResult {
  ok: boolean;
  reason?: CronAuthFailure;
  receivedLength?: number; // só o tamanho, nunca o valor: ajuda a ver um segredo cortado ou com lixo
  expectedLength?: number;
}

const digest = (value: string) => createHash("sha256").update(value).digest();

// Pura (testável): compara o cabeçalho com o segredo.
export function checkCronHeader(header: string | null, secret: string): CronAuthResult {
  const expected = secret.trim();
  if (!header || !header.trim()) return { ok: false, reason: "missing_header" };
  const match = /^bearer\s+(.*)$/i.exec(header.trim());
  if (!match) return { ok: false, reason: "wrong_scheme" };
  const token = match[1].trim();
  // Compara os resumos (SHA-256): tempo constante e sem revelar o tamanho do segredo pela rapidez da resposta.
  const ok = timingSafeEqual(digest(token), digest(expected));
  return ok ? { ok: true } : { ok: false, reason: "secret_mismatch", receivedLength: token.length, expectedLength: expected.length };
}

export function cronAuthorized(request: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) return null;
  const result = checkCronHeader(request.headers.get("authorization"), secret);
  if (!result.ok) {
    // Fica nos registos da Vercel (nunca na resposta): diz PORQUÊ foi recusado, sem revelar valores.
    const path = new URL(request.url).pathname;
    const detail = result.reason === "secret_mismatch" ? ` (recebido ${result.receivedLength} caracteres, esperado ${result.expectedLength}: o CRON_SECRET do GitHub não coincide com o da Vercel)` : "";
    console.warn(`[cron] 401 em ${path}: ${result.reason}${detail}`);
  }
  return result.ok;
}
