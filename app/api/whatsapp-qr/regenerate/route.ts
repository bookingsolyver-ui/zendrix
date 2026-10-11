import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { appOrigin, isSameOrigin } from "@/lib/http/origin";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { connectTenantQr } from "@/lib/openwa/session-manager";

export const maxDuration = 60;

// "Gerar novo QR": descarta a sessão presa DESTE tenant (se não estiver ligada) e cria uma nova. Não afeta mais
// nenhuma organização: tudo é por workspaceId, sob um lock por tenant.
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { success: false, error: "forbidden_origin" },
      { status: 403 },
    );
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    if (!(await getAccess(who.workspaceId)).active)
      return subscriptionRequiredResponse();
    const limited = await rateLimit(`wa-qr-regenerate:${who.workspaceId}`, {
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSeconds) },
        },
      );
    }
    const result = await connectTenantQr(who.workspaceId, appOrigin(request), {
      fresh: true,
    });
    if (!result.ok) {
      const status =
        result.error === "not_configured"
          ? 503
          : result.error === "meta_already_connected" ||
              result.error === "already_connected"
            ? 409
            : 502;
      return NextResponse.json(
        { success: false, error: result.error },
        { status },
      );
    }
    return NextResponse.json({
      success: true,
      state: result.state,
      qr: result.qr,
    });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    return NextResponse.json(
      { success: false, error: "internal" },
      { status: 500 },
    );
  }
}
