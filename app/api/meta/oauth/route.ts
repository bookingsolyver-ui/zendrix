import { cookies } from "next/headers";
import { AuthError } from "@/lib/api-auth";
import { getAccess } from "@/lib/billing/access";
import { appOrigin } from "@/lib/http/origin";
import { saveChannels } from "@/lib/meta/connect";
import {
  decodeStateCookie,
  exchangeCode,
  extendToken,
  fetchPages,
  MetaOAuthError,
  metaOAuthConfig,
  redirectUriFor,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  statesMatch,
  subscribePage,
} from "@/lib/meta/oauth";
import { backToChannels, pickLocale } from "@/lib/meta/oauth-response";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { callbackQuerySchema } from "@/lib/validations/meta-oauth";

export const maxDuration = 60;

// Callback do Facebook Login: GET /api/meta/oauth?code=...&state=...
// Adicione `https://<dominio>/api/meta/oauth` a "Valid OAuth Redirect URIs" no painel da app da Meta.
//
//   state ok -> code -> token curto -> Long-Lived Token -> páginas / contas de Instagram -> subscrever eventos
//   -> guardar (token cifrado) na organização da SESSÃO -> voltar a /dashboard/settings/channels
export async function GET(request: Request) {
  const jar = await cookies();
  const saved = decodeStateCookie(jar.get(STATE_COOKIE)?.value);
  const locale = pickLocale(saved?.locale);

  // O state é de uso único: consome-se (apaga-se o cookie) em QUALQUER desfecho.
  const done = (params: Record<string, string>) => {
    const response = backToChannels(request, locale, params);
    response.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  const query = callbackQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return done({ error: "invalid_request" });
  // O utilizador recusou ou cancelou no Facebook.
  if (query.data.error) return done({ error: "denied" });

  const { code, state } = query.data;
  if (!saved || !code || !state || !statesMatch(state, saved.state)) return done({ error: "invalid_state" });

  let workspaceId: string;
  try {
    ({ workspaceId } = await requireRole(["OWNER", "MANAGER"]));
  } catch (err) {
    if (err instanceof AuthError) return done({ error: err.status === 401 ? "session_expired" : "forbidden" });
    console.error("[meta/oauth] falhou a autenticar", err);
    return done({ error: "server_error" });
  }

  // PAYWALL também no regresso: o plano pode ter caducado entre o início do fluxo e agora.
  if (!(await getAccess(workspaceId)).active) return done({ error: "subscription_required" });

  const limited = await rateLimit(`meta-oauth:${workspaceId}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) return done({ error: "rate_limited" });

  const config = metaOAuthConfig();
  if (!config) return done({ error: "not_configured" });

  try {
    const redirectUri = redirectUriFor(appOrigin(request));
    const shortLived = await exchangeCode(config, code, redirectUri);
    const longLived = await extendToken(config, shortLived);
    const allPages = await fetchPages(longLived);

    // Instagram só interessa nas páginas com uma conta profissional ligada.
    const pages = saved.platform === "instagram" ? allPages.filter((p) => p.instagram_business_account) : allPages;
    if (pages.length === 0) {
      return done({ error: allPages.length === 0 ? "no_pages" : "no_instagram" });
    }

    // Sem a subscrição a Meta não nos envia as mensagens da página: tenta-se, e avisa-se se falhar.
    const subscribed = await Promise.all(pages.map((page) => subscribePage(page)));
    const result = await saveChannels({ workspaceId, platform: saved.platform, pages });

    return done({
      connected: saved.platform,
      count: String(result.connected),
      ...(result.conflicts ? { conflicts: String(result.conflicts) } : {}),
      ...(subscribed.some((ok) => !ok) ? { subscribe: "failed" } : {}),
    });
  } catch (err) {
    // Só códigos: nunca tokens, nem o corpo das respostas da Meta.
    if (err instanceof MetaOAuthError) {
      console.error("[meta/oauth] a Meta recusou:", err.message);
      return done({ error: "meta_error" });
    }
    console.error("[meta/oauth] falhou", err instanceof Error ? err.name : "unknown");
    return done({ error: "server_error" });
  }
}
