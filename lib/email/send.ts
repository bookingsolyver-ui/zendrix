import "server-only";

// Envio de e-mails transacionais (registo, recuperação de palavra-passe, convites) pela API HTTP do Resend,
// sem SDK. Configuração (variáveis de ambiente):
//   RESEND_API_KEY   chave da API (re_...)
//   EMAIL_FROM       remetente de um domínio VERIFICADO no Resend, ex.: "Zentrix <no-reply@o-seu-dominio>"
//   EMAIL_REPLY_TO   opcional: para onde vão as respostas
//   RESEND_API_URL   opcional: sobrepõe o endereço da API (testes com um servidor falso; por omissão, o do Resend)
//
// Sem as duas primeiras o envio fica desligado e quem chama usa outra via (ver lib/auth/signup.ts: o Supabase
// envia o seu próprio e-mail; os convites mostram o link para copiar).

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  // Chave de idempotência: o mesmo pedido repetido (por exemplo, numa repetição) não envia duas vezes.
  idempotencyKey?: string;
}

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string };

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

  let lastError = "unknown";
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
      if (!isRetryableStatus(res.status)) break;
    } catch (err) {
      lastError = err instanceof Error ? err.name : "network"; // timeout ou sem ligação: vale a pena repetir
    }
    if (attempt < MAX_ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }
  // Só o código, nunca o corpo da resposta nem o destinatário.
  console.error("[email] não foi possível enviar:", lastError);
  return { ok: false, error: lastError };
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
