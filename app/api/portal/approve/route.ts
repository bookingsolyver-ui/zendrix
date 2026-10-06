import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorCapture } from "@/lib/superadmin/events";
import { isSameOrigin } from "@/lib/http/origin";
import { looksLikePortalToken } from "@/lib/portal/token";
import { ProposalService } from "@/lib/portal/service";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Aprovação pública de uma proposta (sem sessão: a autenticação é o token do link). Origem verificada, limite por IP e
// resposta igual para tudo o que não seja uma aprovação válida.
export const POST = withErrorCapture("portal/approve", async (request: Request) => {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  const ip = getClientIp(request);
  const limited = await rateLimit(`portal-approve:${ip}`, { limit: 10, windowMs: 10 * 60_000, failClosed: true });
  if (!limited.ok) return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } });

  const body = z.object({ token: z.string(), confirm: z.literal(true) }).safeParse(await request.json().catch(() => null));
  if (!body.success || !looksLikePortalToken(body.data.token)) return NextResponse.json({ success: false, error: "invalid_link" }, { status: 410 });

  try {
    const result = await ProposalService.approve(body.data.token, { ip, userAgent: request.headers.get("user-agent") });
    return result === "approved" ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: "invalid_link" }, { status: 410 });
  } catch (err) {
    console.error("[api/portal/approve] falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
});
