import "server-only";
import { encodeForm, type FormValue } from "@/lib/stripe/encode";

// Cliente mínimo da API REST do Stripe (sem SDK, tal como o webhook já verifica a assinatura à mão).
// A chave secreta (sk_…) só existe no servidor.

const API_BASE = "https://api.stripe.com/v1";
const TIMEOUT_MS = 15_000;

export class StripeNotConfiguredError extends Error {
  constructor(variable: string) {
    super(`${variable} não está definido`);
    this.name = "StripeNotConfiguredError";
  }
}

export class StripeApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "StripeApiError";
  }
}

export function requireEnv(name: "STRIPE_SECRET_KEY" | "STRIPE_PRICE_ID") {
  const value = process.env[name]?.trim();
  if (!value) throw new StripeNotConfiguredError(name);
  return value;
}

export async function stripePost<T>(
  path: string,
  params: { [key: string]: FormValue },
  idempotencyKey?: string,
): Promise<T> {
  const secret = requireEnv("STRIPE_SECRET_KEY");
  const version = process.env.STRIPE_API_VERSION?.trim();

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(version ? { "Stripe-Version": version } : {}),
    },
    body: encodeForm(params),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const json = (await response.json().catch(() => null)) as
    | (T & { error?: { code?: string; message?: string } })
    | null;
  if (!response.ok || !json) {
    throw new StripeApiError(
      response.status,
      json?.error?.code,
      json?.error?.message ?? `Stripe respondeu ${response.status}`,
    );
  }
  return json;
}

// DELETE na API do Stripe (ex.: cancelar uma subscrição de imediato). 404 = já não existe: conta como feito.
export async function stripeDelete(path: string): Promise<void> {
  const secret = requireEnv("STRIPE_SECRET_KEY");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.ok || res.status === 404) return;
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new StripeApiError(res.status, json?.error?.code, json?.error?.message ?? `Stripe respondeu ${res.status}`);
}
