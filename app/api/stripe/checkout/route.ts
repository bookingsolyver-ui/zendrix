import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { appOrigin } from "@/lib/http/origin";
import { createCheckoutSession } from "@/lib/stripe/billing";
import { authorizeBilling, billingErrorResponse } from "@/lib/stripe/route-helpers";

export const maxDuration = 30;

// Cria uma sessão do Stripe Checkout para subscrever o plano (STRIPE_PRICE_ID) e devolve { url }.
// O cliente redireciona para esse URL. O workspaceId vem sempre da sessão, nunca do corpo.
// Corpo opcional: { locale: "pt" | "en" | "es" } para o regresso do Stripe à língua do utilizador.
export async function POST(request: Request) {
  const auth = await authorizeBilling(request, "stripe-checkout", 5);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const locale = routing.locales.find((l) => l === body?.locale) ?? routing.defaultLocale;
  const billingPage = `${appOrigin(request)}/${locale}/dashboard/settings/billing`;

  try {
    const { url, trialing } = await createCheckoutSession({
      workspaceId: auth.workspaceId,
      email: auth.email,
      successUrl: `${billingPage}?checkout=success`,
      cancelUrl: `${billingPage}?checkout=canceled`,
    });
    return NextResponse.json({ success: true, url, trialing });
  } catch (err) {
    return billingErrorResponse(err);
  }
}
