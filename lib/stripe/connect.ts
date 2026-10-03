import "server-only";
import { StripeApiError, StripeNotConfiguredError, requireEnv } from "@/lib/stripe/client";

// Stripe Connect (contas Standard, por OAuth): cada empresa liga a SUA conta Stripe à Zetrix. Os links de
// pagamento que a IA envia são criados nessa conta, por isso o dinheiro dos clientes vai direto para a empresa e
// nunca passa pela conta da Zetrix (que cobra só as subscrições da Zetrix).
//
// Requer: Connect ativado na conta Stripe da Zetrix (plataforma), STRIPE_CONNECT_CLIENT_ID (ca_...) e o URI de
// regresso https://<dominio>/api/stripe/connect/callback nas definições de OAuth do Connect.

export const connectConfigured = () => Boolean(process.env.STRIPE_CONNECT_CLIENT_ID?.trim() && process.env.STRIPE_SECRET_KEY?.trim());

const clientId = () => {
  const value = process.env.STRIPE_CONNECT_CLIENT_ID?.trim();
  if (!value) throw new StripeNotConfiguredError("STRIPE_CONNECT_CLIENT_ID");
  return value;
};

// STRIPE_CONNECT_URL só serve para testes (um servidor falso).
const connectBase = () => process.env.STRIPE_CONNECT_URL?.trim() || "https://connect.stripe.com";

export function connectAuthorizeUrl(input: { state: string; redirectUri: string }): string {
  const url = new URL(`${connectBase()}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("state", input.state);
  url.searchParams.set("redirect_uri", input.redirectUri);
  return url.toString();
}

async function connectPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${connectBase()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json) {
    throw new StripeApiError(res.status, typeof json?.error === "string" ? json.error : undefined, String(json?.error_description ?? `Stripe respondeu ${res.status}`));
  }
  return json;
}

// code -> id da conta ligada (acct_...). É só este id que guardamos: não há tokens da conta da empresa.
export async function exchangeConnectCode(code: string): Promise<string> {
  const json = await connectPost("/oauth/token", { grant_type: "authorization_code", code });
  const id = json.stripe_user_id;
  if (typeof id !== "string" || !/^acct_[A-Za-z0-9]+$/.test(id)) throw new StripeApiError(502, undefined, "resposta inválida");
  return id;
}

// Revoga o acesso da Zetrix a essa conta (ao desligar). Best-effort: não lança.
export async function deauthorizeConnectAccount(accountId: string): Promise<boolean> {
  try {
    await connectPost("/oauth/deauthorize", { client_id: clientId(), stripe_user_id: accountId });
    return true;
  } catch {
    return false;
  }
}
