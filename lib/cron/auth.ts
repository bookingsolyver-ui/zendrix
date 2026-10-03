import "server-only";
import { timingSafeEqual } from "node:crypto";

// Autenticação dos endpoints de cron. A Vercel (e o workflow do GitHub) enviam `Authorization: Bearer <CRON_SECRET>`.
// null = o segredo não está configurado (o endpoint responde 503); true/false = credenciais certas/erradas.
export function cronAuthorized(request: Request): boolean | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
