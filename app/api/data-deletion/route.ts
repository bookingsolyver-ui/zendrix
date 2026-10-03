import { NextResponse } from "next/server";
import { newDeletionCode } from "@/lib/account/delete";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { deletionRequestSchema } from "@/lib/validations/data-deletion";

// Pedido PÚBLICO de eliminação de dados (para quem não consegue entrar na conta). Fica registado com um código e
// é tratado manualmente DEPOIS de verificar que o e-mail é de quem pediu: não se apaga nada só por este pedido
// (senão qualquer pessoa apagava os dados de outra). A resposta é igual exista ou não conta com esse e-mail.
export async function POST(request: Request) {
  const ip = await rateLimit(`data-deletion:ip:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!ip.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(ip.retryAfterSeconds) } },
    );
  }

  const body = deletionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });

  const perEmail = await rateLimit(`data-deletion:email:${body.data.email}`, { limit: 3, windowMs: 24 * 60 * 60 * 1000, failClosed: true });
  if (!perEmail.ok) return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });

  const code = newDeletionCode();
  try {
    await prisma.dataDeletionRequest.create({
      data: { code, source: "web_form", contact: body.data.email, status: "received" },
    });
  } catch (err) {
    console.error("[data-deletion] não gravou o pedido", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
  return NextResponse.json({ success: true, code });
}
