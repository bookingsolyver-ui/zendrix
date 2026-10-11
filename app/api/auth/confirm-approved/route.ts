import { NextResponse } from "next/server";
import { confirmAuthEmails } from "@/lib/auth/confirm-email";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Salvaguarda do login: uma conta que a administração JÁ APROVOU não fica presa por um e-mail de confirmação que
// pode nunca ter chegado. O login chama isto quando o Supabase diz «e-mail por confirmar»; se a organização do
// utilizador está aprovada (decisão de uma pessoa), confirma-se o e-mail e o login repete-se.
// Não dá acesso a ninguém: continua a ser preciso saber a palavra-passe. Responde sempre igual, exista a conta ou
// não, para não revelar quem está registado. Contas por aprovar ou rejeitadas nunca são confirmadas por aqui.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });

  const ip = await rateLimit(`confirm-approved:ip:${getClientIp(request)}`, { limit: 20, windowMs: 10 * 60 * 1000, failClosed: true });
  if (!ip.ok) return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(ip.retryAfterSeconds) } });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });

  const perEmail = await rateLimit(`confirm-approved:email:${email}`, { limit: 5, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!perEmail.ok) return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, authId: { not: null }, workspace: { approvalStatus: "APPROVED", blockedAt: null } },
      select: { authId: true },
    });
    if (user?.authId) await confirmAuthEmails([user.authId]);
  } catch (err) {
    console.error("[auth/confirm-approved] erro", err instanceof Error ? err.name : "unknown");
  }
  return NextResponse.json({ success: true });
}
