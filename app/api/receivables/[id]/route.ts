import { z } from "zod";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/superadmin/flags";

// Marcar uma cobrança como paga ou cancelada (pára os lembretes).
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "receivables/patch", async (who) => {
    const off = await requireFeature(who.workspaceId, "cash_collector");
    if (off) return off;
    const { id } = await ctx.params;
    const body = z.object({ status: z.enum(["PAID", "CANCELLED"]) }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const result = await prisma.receivable.updateMany({ where: { id, workspaceId: who.workspaceId, status: "PENDING" }, data: { status: body.data.status, paidAt: body.data.status === "PAID" ? new Date() : null } });
    return result.count ? ok() : fail("not_found", 404);
  });
}
