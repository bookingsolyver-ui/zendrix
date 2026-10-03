import { prisma } from "@/lib/prisma";
import { MAX_TASKS, taskCreateSchema } from "@/lib/crm/schemas";
import { ALL_ROLES, fail, guarded, ok } from "@/lib/http/route";

// Nova tarefa no quadro do CRM, no fim da coluna escolhida. Qualquer membro da equipa pode.
export async function POST(request: Request) {
  return guarded(request, ALL_ROLES, "crm/tasks", async (who) => {
    const body = taskCreateSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    if ((await prisma.task.count({ where: { workspaceId: who.workspaceId } })) >= MAX_TASKS) return fail("too_many", 409);
    const position = await prisma.task.count({ where: { workspaceId: who.workspaceId, status: body.data.status } });
    const task = await prisma.task.create({
      data: {
        workspaceId: who.workspaceId,
        title: body.data.title,
        description: body.data.description || null,
        status: body.data.status,
        priority: body.data.priority,
        dueAt: body.data.dueAt ?? null,
        position,
      },
      select: { id: true },
    });
    return ok({ id: task.id }, 201);
  });
}
