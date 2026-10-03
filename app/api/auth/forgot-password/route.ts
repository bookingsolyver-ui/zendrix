import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmUrl } from "@/lib/auth/signup";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { emailLang, passwordResetEmail } from "@/lib/email/templates";
import { appOrigin } from "@/lib/http/origin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.string().max(8).optional(),
});

// Pedido de recuperação de palavra-passe. A resposta é SEMPRE a mesma, exista ou não conta com esse e-mail:
// não se revela quem tem conta.
export async function POST(request: Request) {
  const ip = await rateLimit(`forgot:ip:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!ip.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(ip.retryAfterSeconds) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });
  const { email, locale } = body.data;

  // Por e-mail (inclui os que não existem, para o limite não revelar nada): impede inundar uma caixa de correio.
  const perEmail = await rateLimit(`forgot:email:${email}`, { limit: 3, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!perEmail.ok) return NextResponse.json({ success: true });

  const origin = appOrigin(request);
  try {
    const admin = supabaseAdmin();
    if (emailConfigured() && admin) {
      // Resend: o link vai para a nossa página /confirm (token de uso único, só gasto com um clique).
      const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
      if (!error && data.properties?.hashed_token) {
        const url = confirmUrl(origin, locale, { token_hash: data.properties.hashed_token, type: "recovery" });
        await sendEmail({ to: email, ...passwordResetEmail({ url, lang: emailLang(locale) }), idempotencyKey: `reset-${data.user.id}-${Math.floor(Date.now() / 600_000)}` });
      }
    } else {
      // Sem Resend: o Supabase envia o seu e-mail (SMTP configurado lá) e devolve a pessoa a /auth/callback.
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
    }
  } catch (err) {
    console.error("[auth/forgot-password] falhou", err instanceof Error ? err.name : "unknown");
  }
  return NextResponse.json({ success: true });
}
