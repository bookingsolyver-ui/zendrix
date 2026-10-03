import { NextResponse } from "next/server";
import { provisionUser } from "@/lib/auth/provision";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { signUpUser } from "@/lib/auth/signup";
import { appOrigin } from "@/lib/http/origin";
import { findInviteByToken } from "@/lib/team/invites";
import { acceptInviteSchema } from "@/lib/validations/team";

// Aceitar um convite: cria a conta (palavra-passe) para o e-mail DO CONVITE e entra na organização de quem
// convidou, com o papel do convite. O e-mail nunca vem do pedido.
export async function POST(request: Request) {
  const ipLimit = await rateLimit(`accept-invite:ip:${getClientIp(request)}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
    failClosed: true,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  const raw = await request.json().catch(() => null);
  const rawLocale = raw?.locale;
  const body = acceptInviteSchema.safeParse(raw ? { token: raw.token, name: raw.name, password: raw.password } : null);
  if (!body.success) {
    const weak = body.error.issues.some((issue) => issue.path[0] === "password");
    return NextResponse.json({ success: false, error: weak ? "weak_password" : "invalid_input" }, { status: 400 });
  }
  const { token, name, password } = body.data;

  const invite = await findInviteByToken(token);
  if (!invite) return NextResponse.json({ success: false, error: "invite_invalid" }, { status: 410 });

  const signup = await signUpUser({
    email: invite.email,
    password,
    name,
    origin: appOrigin(request),
    locale: typeof rawLocale === "string" ? rawLocale : undefined,
  });
  if (!signup.ok) {
    if (signup.error === "rate_limited") return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
    // Já existe uma conta com este e-mail: é só iniciar sessão, e o convite é reconhecido pelo e-mail verificado
    // (lib/auth/provision.ts).
    if (signup.error === "email_exists") return NextResponse.json({ success: false, error: "email_exists" }, { status: 409 });
    return NextResponse.json({ success: false, error: signup.error === "weak_password" ? "weak_password" : "signup_failed" }, { status: 400 });
  }

  try {
    await provisionUser({
      authId: signup.userId,
      email: invite.email,
      emailVerified: signup.emailVerified,
      name,
      inviteToken: token,
    });
  } catch (err) {
    console.error("[auth/accept-invite] provisionamento falhou", err);
    return NextResponse.json({ success: false, error: "provision_failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true, needsConfirmation: !signup.hasSession });
}
