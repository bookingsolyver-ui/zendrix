import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { deleteAccount } from "@/lib/account/delete";
import { isSameOrigin } from "@/lib/http/origin";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { deleteAccountSchema } from "@/lib/validations/data-deletion";

export const maxDuration = 60;

// Eliminar a conta e todos os dados da organização, de forma definitiva. Só o OWNER, só com sessão, e é preciso
// escrever ELIMINAR. NÃO está atrás do paywall: quem não paga também tem direito a apagar os seus dados.
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER"]);

    const limited = await rateLimit(`account-delete:${who.workspaceId}`, { limit: 3, windowMs: 60 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }
    const body = deleteAccountSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ success: false, error: "confirmation_required" }, { status: 400 });

    const result = await deleteAccount(who.workspaceId);
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 502;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }
    return NextResponse.json({ success: true, code: result.code });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/account] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
