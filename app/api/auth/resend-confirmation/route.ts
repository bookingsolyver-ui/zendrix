import { NextResponse } from "next/server";
import { confirmUrl } from "@/lib/auth/signup";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { confirmSignupEmail, emailLang } from "@/lib/email/templates";
import { appOrigin, isSameOrigin } from "@/lib/http/origin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR_MS = 60 * 60 * 1000;

// «Reenviar e-mail de confirmação». Responde SEMPRE com sucesso a um pedido válido, exista a conta ou não, esteja
// confirmada ou não: assim não revela quem tem conta (enumeração). Só se envia a contas que existem e ainda não
// confirmaram. Limites por IP e por endereço, para não servir de arma contra uma caixa de correio.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  const ip = await rateLimit(`resend:ip:${getClientIp(request)}`, { limit: 10, windowMs: HOUR_MS, failClosed: true });
  if (!ip.ok) return tooMany(ip.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const locale = typeof body?.locale === "string" ? body.locale.slice(0, 8) : undefined;
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });
  }

  const perEmail = await rateLimit(`resend:email:${email.toLowerCase()}`, { limit: 3, windowMs: HOUR_MS, failClosed: true });
  if (!perEmail.ok) return tooMany(perEmail.retryAfterSeconds);

  const origin = appOrigin(request);
  const admin = supabaseAdmin();

  try {
    if (emailConfigured() && admin) {
      // magiclink: único tipo de link que o Supabase gera para uma conta que já existe (o «signup» exige criá-la).
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      // Conta inexistente ou já confirmada: não se envia nada, mas a resposta é igual.
      if (error || !data.user || data.user.email_confirmed_at || !data.properties?.hashed_token) {
        return NextResponse.json({ success: true });
      }
      const name = typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null;
      const sent = await sendEmail({
        to: email,
        ...confirmSignupEmail({
          name,
          url: confirmUrl(origin, locale, { token_hash: data.properties.hashed_token, type: "magiclink" }),
          lang: emailLang(locale),
        }),
        // Um pedido por minuto e utilizador: dois cliques seguidos não enviam dois e-mails.
        idempotencyKey: `resend-${data.user.id}-${Math.floor(Date.now() / 60_000)}`,
      });
      if (sent.ok) return NextResponse.json({ success: true });
      console.error("[auth/resend] Resend falhou; recurso do Supabase");
    }
    // Sem Resend (ou se falhou): o Supabase envia o seu e-mail pelo SMTP configurado lá.
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${origin}/auth/callback` } });
    if (error) console.error("[auth/resend] Supabase falhou", error.status, error.code);
  } catch (err) {
    console.error("[auth/resend] erro", err instanceof Error ? err.name : "unknown");
  }
  return NextResponse.json({ success: true });
}

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
