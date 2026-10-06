import { z } from "zod";
import { auditContext } from "@/lib/audit/ledger";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { ProposalService } from "@/lib/portal/service";
import { requireFeature } from "@/lib/superadmin/flags";

// Novo link para uma proposta ainda por aprovar (o link anterior deixa de funcionar).
export async function POST(request: Request, routeCtx: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "proposals/link", async (who) => {
    const off = await requireFeature(who.workspaceId, "portal");
    if (off) return off;
    const { id } = await routeCtx.params;
    const body = z.object({ sendWhatsApp: z.boolean().optional() }).safeParse(await request.json().catch(() => ({})));
    if (!body.success) return fail("invalid_input", 400);
    const result = await ProposalService.rotate(await auditContext(request, who), id, body.data.sendWhatsApp);
    return result.ok ? ok({ url: result.url, whatsapp: result.whatsapp }) : fail(result.error, 404);
  });
}
