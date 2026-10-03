import { z } from "zod";
import { popupInputSchema } from "@/lib/popups/schema";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/team";

const toggleSchema = z.object({ active: z.boolean() });

// PATCH com { active } liga/desliga; com o popup completo edita-o. Sempre dentro da organização da sessão.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "popups/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const raw = await request.json().catch(() => null);
    if (!id.success) return fail("invalid_input", 400);

    const toggle = toggleSchema.safeParse(raw);
    if (toggle.success) {
      const { count } = await prisma.popup.updateMany({ where: { id: id.data, workspaceId: who.workspaceId }, data: { active: toggle.data.active } });
      return count > 0 ? ok() : fail("not_found", 404);
    }
    const body = popupInputSchema.safeParse(raw);
    if (!body.success) return fail("invalid_input", 400);
    const { count } = await prisma.popup.updateMany({ where: { id: id.data, workspaceId: who.workspaceId }, data: { name: body.data.name, config: body.data.config } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "popups/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.popup.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}
