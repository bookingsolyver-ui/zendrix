import { z } from "zod";
import { automationInputSchema } from "@/lib/automations/schema";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/team";

const toggleSchema = z.object({ active: z.boolean() });

// PATCH com { active } liga/desliga; PATCH com a automação completa edita-a. Ao LIGAR, o cursor volta a "agora":
// só reage ao que acontecer depois (nunca dispara retroativamente sobre contactos antigos).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "automations/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const raw = await request.json().catch(() => null);
    if (!id.success) return fail("invalid_input", 400);

    const toggle = toggleSchema.safeParse(raw);
    if (toggle.success) {
      const now = new Date();
      const { count } = await prisma.automation.updateMany({
        where: { id: id.data, workspaceId: who.workspaceId, active: !toggle.data.active },
        data: toggle.data.active ? { active: true, activatedAt: now, cursorAt: now } : { active: false },
      });
      if (count > 0) return ok();
      const exists = await prisma.automation.count({ where: { id: id.data, workspaceId: who.workspaceId } });
      return exists ? ok() : fail("not_found", 404); // já estava nesse estado: idempotente
    }

    const body = automationInputSchema.safeParse(raw);
    if (!body.success) return fail("invalid_input", 400);
    const { count } = await prisma.automation.updateMany({
      where: { id: id.data, workspaceId: who.workspaceId },
      data: { name: body.data.name, trigger: body.data.trigger, config: body.data.config, actions: body.data.actions },
    });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "automations/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.automation.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}
