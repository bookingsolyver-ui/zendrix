import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { auditContext } from "@/lib/audit/ledger";
import { Fortress } from "@/lib/fortress/service";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { proposalInputSchema } from "@/lib/portal/lines";
import { ProposalService } from "@/lib/portal/service";
import { requireRole } from "@/lib/rbac";
import { requireFeature } from "@/lib/superadmin/flags";

export async function GET(request: Request) {
  try {
    const who = await requireRole(MANAGERS, request);
    const off = await requireFeature(who.workspaceId, "portal");
    if (off) return off;
    return NextResponse.json({ success: true, proposals: await ProposalService.list(who.workspaceId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/proposals] falhou", err);
    return fail("internal", 500);
  }
}

// Cria a proposta e o link mágico (7 dias). Devolve o URL para copiar; com sendWhatsApp tenta enviá-lo ao cliente.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "proposals", async (who) => {
    const off = await requireFeature(who.workspaceId, "portal");
    if (off) return off;
    const body = proposalInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const result = await ProposalService.create(await auditContext(request, who), { ...body.data, createdById: await Fortress.resolveUserId(who) });
    return result.ok ? ok({ id: result.id, url: result.url, whatsapp: result.whatsapp }, 201) : fail(result.error, result.error === "not_found" ? 404 : 400);
  });
}
