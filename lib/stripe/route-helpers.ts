import "server-only";
import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { BillingError } from "@/lib/stripe/billing";
import { StripeApiError, StripeNotConfiguredError } from "@/lib/stripe/client";

const fail = (error: string, status: number, headers?: Record<string, string>) =>
  NextResponse.json({ success: false, error }, { status, headers });

// Comum às duas rotas: mesma origem, sessão, papel (OWNER ou MANAGER: a faturação não é para STAFF) e
// limite de pedidos. Só sessão: uma chave de API não abre o Checkout nem o portal. Devolve o utilizador
// ou a resposta de erro a enviar.
export async function authorizeBilling(request: Request, bucket: string, limit: number) {
  if (!isSameOrigin(request)) return { response: fail("forbidden_origin", 403) };

  let principal;
  try {
    principal = await requireRole(["OWNER", "MANAGER"]);
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return { response };
    throw err;
  }

  const limited = await rateLimit(`${bucket}:${principal.workspaceId}`, { limit, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) {
    return {
      response: fail("rate_limited", 429, { "Retry-After": String(limited.retryAfterSeconds) }),
    };
  }
  return { workspaceId: principal.workspaceId, email: principal.userEmail ?? "" };
}

// Erros conhecidos -> resposta; o resto fica no log do servidor e o cliente só vê "billing_failed".
export function billingErrorResponse(err: unknown) {
  if (err instanceof BillingError) {
    const status = err.code === "workspace_not_found" ? 404 : 409;
    return fail(err.code, status);
  }
  if (err instanceof StripeNotConfiguredError) {
    console.error("[stripe]", err.message);
    return fail("billing_not_configured", 503);
  }
  if (err instanceof StripeApiError) {
    console.error("[stripe] a API recusou o pedido:", err.status, err.code, err.message);
    return fail("billing_failed", 502);
  }
  console.error("[stripe] falha inesperada", err);
  return fail("billing_failed", 500);
}
