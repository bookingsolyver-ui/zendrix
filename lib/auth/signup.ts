import "server-only";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { confirmSignupEmail, emailLang } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Criar a conta de Auth. Dois caminhos, escolhidos pela configuração:
//
//  1. RESEND (RESEND_API_KEY + EMAIL_FROM + service role): o utilizador é criado com admin.generateLink (que NÃO
//     envia e-mail) e nós enviamos o e-mail de confirmação pelo Resend, com o nosso modelo. O link vai para a
//     página /confirm, que pede um clique antes de gastar o token (os antivírus de e-mail abrem os links e
//     consumiriam um link de uso único).
//  2. SUPABASE (por omissão): auth.signUp; o Supabase envia o seu e-mail pelo SMTP que lá estiver configurado.
//     É o comportamento de antes e serve de recurso se o Resend falhar.
//
// Quem chama (registo, aceitar convite) não precisa de saber qual dos dois correu.

export type SignupError = "email_exists" | "rate_limited" | "weak_password" | "signup_failed";

export type SignupResult =
  | { ok: true; userId: string; emailVerified: boolean; hasSession: boolean }
  | { ok: false; error: SignupError };

interface SignupInput {
  email: string;
  password: string;
  name: string;
  origin: string; // o endereço público da app (para os links dos e-mails)
  locale?: string;
}

export const confirmUrl = (origin: string, locale: string | undefined, params: Record<string, string>) =>
  `${origin}/${locale ?? "pt"}/confirm?${new URLSearchParams(params).toString()}`;

function classify(error: { status?: number; code?: string; message?: string }): SignupError {
  if (error.code === "email_exists" || /already (been )?registered/i.test(error.message ?? "")) return "email_exists";
  if (error.status === 429 || error.code === "over_email_send_rate_limit") return "rate_limited";
  if (error.code === "weak_password") return "weak_password";
  return "signup_failed";
}

export async function signUpUser(input: SignupInput): Promise<SignupResult> {
  const { email, password, name, origin, locale } = input;

  const admin = supabaseAdmin();
  if (emailConfigured() && admin) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user || !data.properties?.hashed_token) {
      if (error) console.error("[auth/signup] generateLink falhou", error.status, error.code);
      return { ok: false, error: error ? classify(error) : "signup_failed" };
    }

    const url = confirmUrl(origin, locale, { token_hash: data.properties.hashed_token, type: "signup" });
    const sent = await sendEmail({
      to: email,
      ...confirmSignupEmail({ name, url, lang: emailLang(locale) }),
      idempotencyKey: `signup-${data.user.id}`,
    });
    if (!sent.ok) {
      // O Resend falhou (domínio por verificar, chave errada...): o Supabase envia o seu e-mail em vez do nosso,
      // para a pessoa não ficar sem conta ativável. O utilizador já existe, por isso é um reenvio.
      const supabase = await createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      if (resendError) console.error("[auth/signup] recurso do Supabase também falhou", resendError.status);
    }
    return { ok: true, userId: data.user.id, emailVerified: false, hasSession: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    console.error("[auth/signup] supabase signUp falhou", error.status, error.code);
    return { ok: false, error: classify(error) };
  }
  // Com a confirmação por e-mail ligada, o Supabase devolve um utilizador sem identidades quando o e-mail já existe.
  if (!data.user || data.user.identities?.length === 0) return { ok: false, error: "email_exists" };
  return {
    ok: true,
    userId: data.user.id,
    emailVerified: Boolean(data.user.email_confirmed_at),
    hasSession: Boolean(data.session),
  };
}
