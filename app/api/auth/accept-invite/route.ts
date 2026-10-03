import { NextResponse } from "next/server";
import { provisionUser } from "@/lib/auth/provision";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
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

  const body = acceptInviteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const weak = body.error.issues.some((issue) => issue.path[0] === "password");
    return NextResponse.json({ success: false, error: weak ? "weak_password" : "invalid_input" }, { status: 400 });
  }
  const { token, name, password } = body.data;

  const invite = await findInviteByToken(token);
  if (!invite) return NextResponse.json({ success: false, error: "invite_invalid" }, { status: 410 });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: invite.email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
    },
  });
  if (error) {
    console.error("[auth/accept-invite] supabase signUp falhou", error.status, error.code);
    if (error.status === 429) {
      return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ success: false, error: "signup_failed" }, { status: 400 });
  }
  // Já existe uma conta com este e-mail (Supabase devolve um utilizador sem identidades): é só iniciar sessão,
  // e o convite é reconhecido pelo e-mail verificado (lib/auth/provision.ts).
  if (!data.user || data.user.identities?.length === 0) {
    return NextResponse.json({ success: false, error: "email_exists" }, { status: 409 });
  }

  try {
    await provisionUser({
      authId: data.user.id,
      email: invite.email,
      emailVerified: Boolean(data.user.email_confirmed_at),
      name,
      inviteToken: token,
    });
  } catch (err) {
    console.error("[auth/accept-invite] provisionamento falhou", err);
    return NextResponse.json({ success: false, error: "provision_failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true, needsConfirmation: !data.session });
}
