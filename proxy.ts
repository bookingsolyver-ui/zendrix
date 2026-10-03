import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Splits "/pt/dashboard/x" into the locale ("pt") and the rest ("/dashboard/x").
// Returns null for paths without a locale prefix: the i18n step redirects those first.
function splitLocale(pathname: string) {
  const [, first, ...rest] = pathname.split("/");
  const locale = routing.locales.find((l) => l === first);
  if (!locale) return null;
  return { locale, path: `/${rest.join("/")}` };
}

function isProtectedPath(path: string) {
  // /admin também exige sessão aqui; quem tem sessão mas não é administrador da plataforma recebe 404 do layout.
  return path === "/dashboard" || path.startsWith("/dashboard/") || path === "/admin" || path.startsWith("/admin/");
}

export default async function proxy(request: NextRequest) {
  // next-intl decides the response first (locale redirects/rewrites stay exactly as before).
  const response = handleI18nRouting(request);

  const parts = splitLocale(request.nextUrl.pathname);
  const isProtected = parts !== null && isProtectedPath(parts.path);
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));

  // Public pages without a session need no Supabase round trip.
  if (!isProtected && !hasAuthCookie) return response;

  let userId: string | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      });
      // getUser() validates the token with Supabase (unlike getSession()) and refreshes it.
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch (err) {
      console.error("[proxy] supabase session check failed", err);
    }
  }

  // Protected routes fail closed: no verified user (or an auth outage) means login.
  if (isProtected && parts && !userId) {
    const loginUrl = new URL(`/${parts.locale}/login`, request.url);
    // `next` carries the path without locale; the i18n router re-adds it after login.
    loginUrl.searchParams.set("next", `${parts.path}${request.nextUrl.search}`);

    const redirect = NextResponse.redirect(loginUrl);
    // Keep any cookies Supabase just refreshed/cleared on the redirect too.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  // `auth` is excluded so /auth/callback stays outside the locale routing.
  matcher: ["/((?!api|auth(?:/|$)|trpc|_next|_vercel|.*\\..*).*)"],
};
