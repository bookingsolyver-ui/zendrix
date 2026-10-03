import { prisma } from "@/lib/prisma";
import { insertAt, taskPatchSchema } from "@/lib/crm/schemas";
import { ALL_ROLES, fail, guarded, ok } from "@/lib/http/route";
import { idSchema } from "@/lib/validations/team";

// Editar uma tarefa ou movê-la (mudar de coluna e/ou de posição). A coluna de destino é reordenada de forma atómica.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, ALL_ROLES, "crm/tasks/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = taskPatchSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);
    const { index, ...fields } = body.data;

    const done = await prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({ where: { id: id.data, workspaceId: who.workspaceId }, select: { id: true, status: true } });
      if (!task) return false;
      const status = fields.status ?? task.status;
      const moving = fields.status !== undefined || index !== undefined;

      await tx.task.update({
        where: { id: task.id },
        data: {
          ...(fields.title !== undefined ? { title: fields.title } : {}),
          ...(fields.description !== undefined ? { description: fields.description || null } : {}),
          ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
          ...(fields.dueAt !== undefined ? { dueAt: fields.dueAt } : {}),
          ...(fields.status !== undefined ? { status } : {}),
        },
      });

      if (moving) {
        const column = await tx.task.findMany({
          where: { workspaceId: who.workspaceId, status },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        const ordered = insertAt(column.map((row) => row.id), task.id, index ?? column.length);
        await Promise.all(ordered.map((taskId, position) => tx.task.update({ where: { id: taskId }, data: { position } })));
      }
      return true;
    });
    return done ? ok() : fail("not_found", 404);
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, ALL_ROLES, "crm/tasks/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.task.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}
