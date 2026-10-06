import { z } from "zod";
import { DataCleanerService } from "@/lib/cleaner/service";
import { Fortress } from "@/lib/fortress/service";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { requireFeature } from "@/lib/superadmin/flags";

// Merge seguro de um par de duplicados (junta notas, receita e conversas; o redundante fica marcado como fundido, não é apagado). Só OWNER e MANAGER.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "data-cleaner/merge", async (who) => {
    const off = await requireFeature(who.workspaceId, "data_cleaner");
    if (off) return off;
    const body = z.object({ candidateId: z.string().min(1).max(40) }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const result = await DataCleanerService.merge(who.workspaceId, body.data.candidateId, await Fortress.resolveUserId(who));
    return result === "merged" ? ok() : fail(result, result === "not_found" ? 404 : 409);
  });
}
