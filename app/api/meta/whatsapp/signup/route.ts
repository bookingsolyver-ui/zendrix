import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { isSameOrigin } from "@/lib/http/origin";
import { connectWhatsAppEmbedded, type EmbeddedSignupError } from "@/lib/meta/embedded-signup";
import { metaOAuthConfig } from "@/lib/meta/oauth";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { embeddedSignupRequestSchema } from "@/lib/validations/meta-embedded";

export const maxDuration = 60;

const STATUS: Record<EmbeddedSignupError, number> = {
  invalid_code: 400,
  not_your_number: 403,
  waba_mismatch: 403,
  conflict: 409,
  meta_error: 502,
};

// Fim do Embedded Signup do WhatsApp: o browser envia o `code` do FB.login e os ids do popup. Só OWNER/MANAGER,
// só com sessão e plano ativo. Os ids são verificados na Graph API (lib/meta/embedded-signup.ts).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    if (!(await getAccess(who.workspaceId)).active) return subscriptionRequiredResponse();

    const limited = await rateLimit(`wa-embedded:${who.workspaceId}`, { limit: 10, windowMs: 10 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const config = metaOAuthConfig();
    if (!config) return NextResponse.json({ success: false, error: "not_configured" }, { status: 503 });

    const body = embeddedSignupRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

    const result = await connectWhatsAppEmbedded({ config, workspaceId: who.workspaceId, ...body.data });
    if (!result.ok) {
      console.error("[meta/whatsapp/signup] recusado:", result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: STATUS[result.error] });
    }
    return NextResponse.json({
      success: true,
      phoneNumber: result.displayPhoneNumber,
      verifiedName: result.verifiedName,
      subscribed: result.subscribed,
    });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[meta/whatsapp/signup] falhou", err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
