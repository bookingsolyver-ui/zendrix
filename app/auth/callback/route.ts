import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/auth/provision";

// Only same-site relative paths are accepted, so this cannot be used as an open redirect.
function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}

// Exchanges the one-time `code` from email confirmation / magic links for a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // Behind a proxy/CDN the public host comes from x-forwarded-host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV !== "production" || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      try {
        await provisionUser({
          authId: data.user.id,
          email: data.user.email,
          emailVerified: Boolean(data.user.email_confirmed_at),
          name:
            typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null,
        });
      } catch (err) {
        // The session is valid; /api/auth/provision retries on the next login.
        console.error("[auth/callback] provisioning failed", err);
      }
      // No locale here on purpose: the i18n proxy adds the user's locale to the redirect.
      return NextResponse.redirect(`${base}${next}`);
    }
    if (error) console.error("[auth/callback] code exchange failed", error.status, error.message);
  }

  return NextResponse.redirect(`${base}/login?error=callback`);
}
