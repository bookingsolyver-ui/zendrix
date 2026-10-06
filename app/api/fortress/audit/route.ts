import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { AuditLogService } from "@/lib/fortress/audit";
import { fail, MANAGERS } from "@/lib/http/route";
import { requireRole } from "@/lib/rbac";

// Os últimos eventos de auditoria da organização (bloqueios, handoffs, fusões). Só OWNER e MANAGER.
export async function GET(request: Request) {
  try {
    const who = await requireRole(MANAGERS, request);
    return NextResponse.json({ success: true, events: await AuditLogService.list(who.workspaceId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/fortress/audit] falhou", err);
    return fail("internal", 500);
  }
}
