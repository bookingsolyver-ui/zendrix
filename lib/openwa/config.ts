import { createHmac, timingSafeEqual } from "node:crypto";

// Canal WhatsApp por QR Code (OpenWA, não oficial). O OpenWA corre NUM SERVIDOR TEU (processo permanente com
// sessões em disco: não corre na Vercel). Aqui só há o cliente e a configuração. Ver docs/kwanza-openwa.md.

// Prefixo do `providerAccountId` das integrações por QR: "qr:<id da sessão no OpenWA>". Distingue-as das da Meta
// sem tocar no schema; o resto do sistema (webhook, Inbox, fila, agente) trata-as como WhatsApp.
export const QR_PREFIX = "qr:";
export const isQrAccount = (accountId: string | null | undefined): accountId is string =>
  typeof accountId === "string" && accountId.startsWith(QR_PREFIX);
export const sessionOf = (accountId: string) => accountId.slice(QR_PREFIX.length);

export interface OpenWaConfig {
  baseUrl: string;
  apiKey: string; // chave de ADMIN do OpenWA (API_MASTER_KEY): só no servidor, nunca no browser
}

// https obrigatório, exceto localhost (desenvolvimento).
export function parseBaseUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function openWaConfig(env: Record<string, string | undefined> = process.env): OpenWaConfig | null {
  const baseUrl = parseBaseUrl(env.OPENWA_URL);
  const apiKey = env.OPENWA_API_KEY?.trim();
  return baseUrl && apiKey ? { baseUrl, apiKey } : null;
}

// Nome da sessão: determinístico, uma por organização. O OpenWA aceita letras, números e hífenes (3 a 50).
export function sessionNameFor(workspaceId: string): string {
  const slug = workspaceId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 28);
  return `kf-${slug}`;
}

// Segredo de assinatura do webhook de CADA sessão: derivado (HMAC) do id da sessão com a chave do servidor.
// Não se guarda e não se adivinha; o OpenWA assina cada entrega com ele (X-OpenWA-Signature: sha256=<hex>).
export function webhookSecret(sessionId: string, key: string): string {
  return createHmac("sha256", key).update(`openwa-webhook:${sessionId}`).digest("hex");
}

// Valida o cabeçalho "sha256=<hex>" sobre o corpo EXATO recebido.
export function isValidSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice("sha256=".length);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
