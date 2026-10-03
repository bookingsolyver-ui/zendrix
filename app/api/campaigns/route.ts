import { campaignInputSchema } from "@/lib/campaigns/schema";
import { createCampaign } from "@/lib/campaigns/engine";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";

export const maxDuration = 60;

// Criar uma campanha (agora ou agendada). Só proprietário e gestores: um envio em massa fala em nome do negócio.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "campaigns", async (who) => {
    const body = campaignInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail(body.error.issues.some((i) => i.message === "unknown_placeholder") ? "unknown_placeholder" : "invalid_input", 400);
    const result = await createCampaign({ workspaceId: who.workspaceId, data: body.data });
    if (!result.ok) return fail(result.error, result.error === "too_many_active" ? 409 : 400);
    return ok({ id: result.id }, 201);
  });
}
