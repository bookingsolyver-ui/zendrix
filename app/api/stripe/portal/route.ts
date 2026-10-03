import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { appOrigin } from "@/lib/http/origin";
import { createPortalSession } from "@/lib/stripe/billing";
import { authorizeBilling, billingErrorResponse } from "@/lib/stripe/route-helpers";

export const maxDuration = 30;

// Abre o portal de faturação do Stripe (método de pagamento, faturas, cancelar) e devolve { url }.
// Só existe para organizações que já passaram pelo Checkout (têm cliente no Stripe).
export async function POST(request: Request) {
  const auth = await authorizeBilling(request, "stripe-portal", 10);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const locale = routing.locales.find((l) => l === body?.locale) ?? routing.defaultLocale;

  try {
    const { url } = await createPortalSession(
      auth.workspaceId,
      `${appOrigin(request)}/${locale}/dashboard/settings/billing`,
    );
    return NextResponse.json({ success: true, url });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
