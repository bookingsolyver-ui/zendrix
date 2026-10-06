import { z } from "zod";
import { Fortress } from "@/lib/fortress/service";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";

// Desbloquear uma conta bloqueada pelo Fortress. Só OWNER e MANAGER; fica registado na auditoria.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "fortress/unlock", async (who) => {
    const body = z.object({ userId: z.string().min(1).max(40) }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const actor = await Fortress.resolveUserId(who);
    return ok({ unlocked: await Fortress.unlock(who.workspaceId, body.data.userId, actor) });
  });
}
