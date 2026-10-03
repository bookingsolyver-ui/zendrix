import { NextResponse } from "next/server";
import { AuthError } from "@/lib/api-auth";
import { getAccess } from "@/lib/billing/access";
import { appOrigin } from "@/lib/http/origin";
import {
  buildAuthorizeUrl,
  encodeStateCookie,
  metaOAuthConfig,
  newState,
  redirectUriFor,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  STATE_TTL_SECONDS,
} from "@/lib/meta/oauth";
import { backToChannels, pickLocale } from "@/lib/meta/oauth-response";
import { requireRole } from "@/lib/rbac";
import { startQuerySchema } from "@/lib/validations/meta-oauth";

// Início do fluxo "Ligar conta": GET /api/meta/oauth/start?platform=instagram|messenger&locale=pt
// Só OWNER/MANAGER com sessão. Gera o `state` anti-CSRF (cookie httpOnly + parâmetro) e redireciona para o
// Facebook com o App ID e as permissões. O regresso é em /api/meta/oauth.
export async function GET(request: Request) {
  const query = startQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  const locale = pickLocale(query.success ? query.data.locale : undefined);
  if (!query.success) return backToChannels(request, locale, { error: "invalid_request" });

  const config = metaOAuthConfig();
  if (!config) return backToChannels(request, locale, { error: "not_configured" });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    // PAYWALL: sem plano ativo não se ligam canais novos.
    if (!(await getAccess(who.workspaceId)).active) return backToChannels(request, locale, { error: "subscription_required" });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.status === 401) return NextResponse.redirect(new URL(`/${locale}/login`, appOrigin(request)));
      return backToChannels(request, locale, { error: "forbidden" });
    }
    console.error("[meta/oauth/start] falhou", err);
    return backToChannels(request, locale, { error: "server_error" });
  }

  const state = newState();
  const response = NextResponse.redirect(
    buildAuthorizeUrl({ config, redirectUri: redirectUriFor(appOrigin(request)), state }),
  );
  response.cookies.set(STATE_COOKIE, encodeStateCookie({ state, platform: query.data.platform, locale }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // tem de ir no regresso do Facebook (navegação de topo, GET)
    path: STATE_COOKIE_PATH,
    maxAge: STATE_TTL_SECONDS,
  });
  return response;
}
