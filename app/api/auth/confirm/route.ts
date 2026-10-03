import { after, NextResponse } from "next/server";
import { z } from "zod";
import { provisionUser } from "@/lib/auth/provision";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { emailLang, welcomeEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/http/origin";
import { safeNextPath } from "@/lib/http/safe-next";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  token_hash: z.string().min(10).max(512),
  type: z.enum(["signup", "recovery"]),
  next: z.string().max(200).optional(),
  locale: z.string().max(8).optional(),
});

// Consome o link de um e-mail (confirmar o registo ou recuperar a palavra-passe). É um POST feito pelo botão da
// página /confirm: abrir o link (um antivírus de e-mail, um pré-visualizador) nunca gasta o token de uso único.
export async function POST(request: Request) {
  const limited = await rateLimit(`auth-confirm:${getClientIp(request)}`, { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
  const { token_hash, type, next, locale } = body.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error || !data.user) {
    return NextResponse.json({ success: false, error: "invalid_or_expired" }, { status: 400 });
  }

  if (type === "recovery") {
    // A sessão de recuperação já está nos cookies: a página seguinte pede a nova palavra-passe.
    return NextResponse.json({ success: true, redirectTo: "/reset-password" });
  }

  const name = typeof data.user.user_metadata?.name === "string" ? data.user.user_metadata.name : null;
  if (data.user.email) {
    try {
      await provisionUser({ authId: data.user.id, email: data.user.email, emailVerified: true, name, locale });
    } catch (err) {
      // A sessão é válida; /api/auth/provision repete isto no próximo início de sessão.
      console.error("[auth/confirm] provisioning failed", err);
    }
    // Boas-vindas depois da resposta, para nunca atrasar nem falhar o acesso.
    {
      const to = data.user.email;
      const userId = data.user.id;
      const dashboardUrl = `${appOrigin(request)}/${locale ?? "pt"}/dashboard`;
      const row = await prisma.user
        .findUnique({ where: { authId: userId }, select: { locale: true, workspaceId: true, workspace: { select: { approvalStatus: true } } } })
        .catch(() => null);
      const pending = row?.workspace.approvalStatus === "PENDING_APPROVAL";
      const lang = emailLang(row?.locale ?? locale);
      // Conta por aprovar: o aviso «conta em análise» já saiu quando o registo foi gravado (lib/auth/provision.ts).
      // Aqui só as boas-vindas, e só a contas já ativas.
      after(async () => {
        if (!pending && emailConfigured()) {
          await sendEmail({ to, ...welcomeEmail({ name, dashboardUrl, lang }), idempotencyKey: `welcome-${userId}` });
        }
      });
    }
  }
  return NextResponse.json({ success: true, redirectTo: safeNextPath(next) });
}
