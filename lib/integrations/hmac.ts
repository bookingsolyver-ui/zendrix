import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Verificação de webhooks assinados (banco, AGT...). Puro (sem base de dados): testável.
//
// Contrato (o fornecedor assina assim):
//   x-zetrix-timestamp: <segundos unix>
//   x-zetrix-signature: sha256=<hex de HMAC-SHA256(segredo, `${timestamp}.${corpo em bruto}`)>
// O timestamp entra na assinatura e é limitado a uma janela curta: um pedido capturado não se repete mais tarde.

export const SIGNATURE_HEADER = "x-zetrix-signature";
export const TIMESTAMP_HEADER = "x-zetrix-timestamp";
export const MAX_SKEW_SECONDS = 5 * 60;

export type SignatureFailure = "missing_signature" | "missing_timestamp" | "stale_timestamp" | "bad_signature";

export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex")}`;
}

export function verifyWebhookSignature(input: {
  secret: string;
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  nowSeconds?: number;
}): { ok: true } | { ok: false; reason: SignatureFailure } {
  const { secret, rawBody, signature, timestamp } = input;
  if (!signature?.startsWith("sha256=")) return { ok: false, reason: "missing_signature" };
  if (!timestamp || !/^\d{9,12}$/.test(timestamp)) return { ok: false, reason: "missing_timestamp" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_SECONDS) return { ok: false, reason: "stale_timestamp" };

  const expected = Buffer.from(signPayload(secret, timestamp, rawBody));
  const received = Buffer.from(signature);
  // Comprimentos iguais primeiro: timingSafeEqual lança se forem diferentes.
  const ok = expected.length === received.length && timingSafeEqual(expected, received);
  return ok ? { ok: true } : { ok: false, reason: "bad_signature" };
}
