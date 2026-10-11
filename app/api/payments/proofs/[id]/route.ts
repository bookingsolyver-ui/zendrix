import { z } from "zod";
import { auditContext } from "@/lib/audit/ledger";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { decideProof } from "@/lib/payments/proofs";
import { rateLimit } from "@/lib/rate-limit";
import { idSchema } from "@/lib/validations/team";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), note: z.string().trim().max(200).optional() }),
]);

// Aprovar ou rejeitar um comprovativo. Só proprietários e gestores: aprovar liberta um pedido e avisa o cliente.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "payments/proofs/decision", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);

    const limited = await rateLimit(`proof-decision:${who.workspaceId}`, { limit: 60, windowMs: 10 * 60 * 1000 });
    if (!limited.ok) return fail("rate_limited", 429);

    const ctx = await auditContext(request, who);
    const result = await decideProof({
      workspaceId: who.workspaceId,
      proofId: id.data,
      action: body.data.action,
      note: body.data.action === "reject" ? body.data.note : null,
      actor: { userId: ctx.actorId ?? null, ip: ctx.ip ?? null },
    });
    if (!result.ok) return fail(result.error, result.error === "not_found" ? 404 : 409);
    return ok({ status: result.status, notified: result.notified });
  });
}
