import "server-only";

// Envio de e-mails transacionais (registo, recuperação de palavra-passe, convites) pela API HTTP do Resend,
// sem SDK. Configuração (variáveis de ambiente):
//   RESEND_API_KEY   chave da API (re_...)
//   EMAIL_FROM       remetente de um domínio VERIFICADO no Resend, ex.: "Kwanza Flow <no-reply@o-seu-dominio>"
//   EMAIL_REPLY_TO   opcional: para onde vão as respostas
//   RESEND_API_URL   opcional: sobrepõe o endereço da API (testes com um servidor falso; por omissão, o do Resend)
//
// Sem as duas primeiras o envio fica desligado e quem chama usa outra via (ver lib/auth/signup.ts: o Supabase
// envia o seu próprio e-mail; os convites mostram o link para copiar).

import { appDomain, domainMismatch, parseFrom, safeDetail } from "./from.ts";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  // Chave de idempotência: o mesmo pedido repetido (por exemplo, numa repetição) não envia duas vezes.
  idempotencyKey?: string;
}

// `status` e `detail` (quando o Resend responde) deixam diagnosticar sem expor o destinatário nem a chave.
export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string; status?: number; detail?: string };

// Cada problema de configuração regista-se UMA vez por instância (não enche os logs a cada e-mail).
const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.error(message);
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [400, 1500];
const TIMEOUT_MS = 10_000;

// Pura (testável): que respostas do Resend merecem nova tentativa? Limite de pedidos (429) e erros do servidor
// (5xx). Os 4xx (domínio não verificado, e-mail inválido, chave errada) não se resolvem a repetir.
export const isRetryableStatus = (status: number) => status === 429 || status >= 500;

export async function sendEmail(input: SendEmailInput, fetchImpl: typeof fetch = fetch): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return { ok: false, error: "not_configured" };
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  const check = parseFrom(from);
  if (!check.ok) {
    warnOnce("from", `[email] EMAIL_FROM inválido (${check.reason}). Use "Kwanza Flow <no-reply@kwanzaflow.com>". O envio foi desligado; o Supabase envia o e-mail em vez do nosso.`);
    return { ok: false, error: "invalid_from" };
  }
  if (domainMismatch(check.domain, process.env.NEXT_PUBLIC_APP_URL)) {
    warnOnce("domain", `[email] aviso: o remetente usa o domínio ${check.domain}, diferente do da app (${appDomain(process.env.NEXT_PUBLIC_APP_URL)}). O Resend só envia de domínios verificados.`);
  }

  let lastError = "unknown";
  let lastStatus: number | undefined;
  let lastDetail: string | undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(process.env.RESEND_API_URL?.trim() || "https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { id?: unknown } | null;
        return { ok: true, id: typeof json?.id === "string" ? json.id : null };
      }
      lastError = `http_${res.status}`;
      lastStatus = res.status;
      // O corpo do erro do Resend ({ name, message }) diz o motivo exato (domínio por verificar, chave inválida...).
      const errBody = (await res.json().catch(() => null)) as { name?: unknown; message?: unknown } | null;
      lastDetail = safeDetail(errBody?.name, errBody?.message);
      if (!isRetryableStatus(res.status)) break;
    } catch (err) {
      lastError = err instanceof Error ? err.name : "network"; // timeout ou sem ligação: vale a pena repetir
    }
    if (attempt < MAX_ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
  // Só o código, nunca o corpo da resposta nem o destinatário.
  console.error("[email] não foi possível enviar:", lastError, lastDetail ?? "", hint(lastStatus));
  return { ok: false, error: lastError, ...(lastStatus ? { status: lastStatus } : {}), ...(lastDetail ? { detail: lastDetail } : {}) };
}

// O que fazer, em português, para os erros mais comuns do Resend.
function hint(status: number | undefined): string {
  if (status === 401) return "→ a RESEND_API_KEY é inválida ou foi revogada (crie outra em resend.com/api-keys).";
  if (status === 403) return "→ o domínio do EMAIL_FROM não está verificado no Resend (resend.com/domains: SPF e DKIM no DNS).";
  if (status === 422) return "→ pedido recusado pelo Resend (remetente ou destinatário inválido).";
  if (status === 429) return "→ limite de envios do Resend atingido.";
  return "";
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
