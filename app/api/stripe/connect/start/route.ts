import { NextResponse } from "next/server";
import { AuthError } from "@/lib/api-auth";
import { getAccess } from "@/lib/billing/access";
import { appOrigin } from "@/lib/http/origin";
import { backToSettings } from "@/lib/http/settings-redirect";
import { newState } from "@/lib/meta/oauth-state";
import { connectAuthorizeUrl, connectConfigured } from "@/lib/stripe/connect";
import { requireRole } from "@/lib/rbac";

// Início do "Ligar o Stripe" (Connect): só OWNER/MANAGER com sessão e plano ativo. Gera o `state` anti-CSRF (cookie
// httpOnly + parâmetro) e redireciona para o Stripe. O regresso é /api/stripe/connect/callback.
const STATE_COOKIE = "stripe_connect_state"; // o callback lê o mesmo cookie

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") ?? undefined;
  if (!connectConfigured()) return backToSettings(request, locale, "sales", { error: "not_configured" });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    if (!(await getAccess(who.workspaceId)).active) return backToSettings(request, locale, "sales", { error: "subscription_required" });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.status === 401) return NextResponse.redirect(new URL(`/${locale ?? "pt"}/login`, appOrigin(request)));
      return backToSettings(request, locale, "sales", { error: "forbidden" });
    }
    console.error("[stripe/connect/start] falhou", err);
    return backToSettings(request, locale, "sales", { error: "server_error" });
  }

  const state = newState();
  const response = NextResponse.redirect(connectAuthorizeUrl({ state, redirectUri: `${appOrigin(request)}/api/stripe/connect/callback` }));
  response.cookies.set(STATE_COOKIE, `${state}.${locale ?? "pt"}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/stripe/connect",
    maxAge: 600,
  });
  return response;
}
