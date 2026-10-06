import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { AuditLedger } from "@/lib/audit/ledger";
import { fail } from "@/lib/http/route";
import { requireRole } from "@/lib/rbac";

// Consulta do livro de auditoria. Só OWNER. Filtros: entityType, entityId, actorId, before (ISO, para paginar), limit.
export async function GET(request: Request) {
  try {
    const who = await requireRole(["OWNER"], request);
    const q = new URL(request.url).searchParams;
    const before = q.get("before") ? new Date(q.get("before") as string) : undefined;
    const events = await AuditLedger.list(who.workspaceId, {
      entityType: q.get("entityType") ?? undefined,
      entityId: q.get("entityId") ?? undefined,
      actorId: q.get("actorId") ?? undefined,
      before: before && !Number.isNaN(before.getTime()) ? before : undefined,
      limit: Number(q.get("limit")) || 100,
    });
    return NextResponse.json({ success: true, events }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/audit-ledger] falhou", err);
    return fail("internal", 500);
  }
}
