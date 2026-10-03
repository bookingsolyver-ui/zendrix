import { automationInputSchema, MAX_AUTOMATIONS } from "@/lib/automations/schema";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";

const errorFor = (issues: { message: string }[]) => (issues.some((i) => i.message === "unknown_placeholder") ? "unknown_placeholder" : issues.some((i) => i.message === "keyword_not_allowed") ? "keyword_not_allowed" : "invalid_input");

// Criar uma automação (nasce desligada: o dono revê e ativa). Só proprietário e gestores.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "automations", async (who) => {
    const body = automationInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail(errorFor(body.error.issues), 400);
    if ((await prisma.automation.count({ where: { workspaceId: who.workspaceId } })) >= MAX_AUTOMATIONS) return fail("too_many", 409);
    const automation = await prisma.automation.create({
      data: { workspaceId: who.workspaceId, name: body.data.name, trigger: body.data.trigger, config: body.data.config, actions: body.data.actions },
      select: { id: true },
    });
    return ok({ id: automation.id }, 201);
  });
}
