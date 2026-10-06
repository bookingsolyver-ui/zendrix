import { z } from "zod";
import { DataCleanerService } from "@/lib/cleaner/service";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { requireFeature } from "@/lib/superadmin/flags";

// Dispensar um par: «não são a mesma pessoa». Só OWNER e MANAGER.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "data-cleaner/dismiss", async (who) => {
    const off = await requireFeature(who.workspaceId, "data_cleaner");
    if (off) return off;
    const body = z.object({ candidateId: z.string().min(1).max(40) }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    return (await DataCleanerService.dismiss(who.workspaceId, body.data.candidateId)) ? ok() : fail("not_found", 404);
  });
}
