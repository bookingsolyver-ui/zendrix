import { prisma } from "@/lib/prisma";
import { docInputSchema } from "@/lib/crm/schemas";
import { ALL_ROLES, MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { idSchema } from "@/lib/validations/team";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, ALL_ROLES, "crm/docs/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = docInputSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);
    const user = who.userEmail ? await prisma.user.findFirst({ where: { workspaceId: who.workspaceId, email: who.userEmail }, select: { name: true } }) : null;
    const { count } = await prisma.doc.updateMany({
      where: { id: id.data, workspaceId: who.workspaceId },
      data: { title: body.data.title, body: body.data.body, lastEditedBy: user?.name || who.userEmail || null },
    });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}

// Apagar documentos é coisa de quem gere (um agente pode criar e editar, mas não apagar o trabalho da equipa).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "crm/docs/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.doc.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}
