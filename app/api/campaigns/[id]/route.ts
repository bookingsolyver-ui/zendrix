import { cancelCampaign } from "@/lib/campaigns/engine";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/team";

// PATCH { action: "cancel" }: o que ainda não saiu deixa de sair.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "campaigns/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = (await request.json().catch(() => null)) as { action?: string } | null;
    if (!id.success || body?.action !== "cancel") return fail("invalid_input", 400);
    const result = await cancelCampaign(who.workspaceId, id.data);
    if (result === "not_found") return fail("not_found", 404);
    return result === "cancelled" ? ok() : fail("not_active", 409);
  });
}

// Apagar uma campanha que já terminou (a ativa tem de ser cancelada primeiro). Os destinatários vão com ela.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "campaigns/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.campaign.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId, status: { in: ["COMPLETED", "FAILED", "CANCELLED"] } } });
    if (count > 0) return ok();
    const exists = await prisma.campaign.count({ where: { id: id.data, workspaceId: who.workspaceId } });
    return exists ? fail("still_active", 409) : fail("not_found", 404);
  });
}
