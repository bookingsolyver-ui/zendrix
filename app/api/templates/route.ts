import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_TEMPLATES, templateInputSchema } from "@/lib/templates/schema";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";

export async function POST(request: Request) {
  return guarded(request, MANAGERS, "templates", async (who) => {
    const body = templateInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    if ((await prisma.messageTemplate.count({ where: { workspaceId: who.workspaceId } })) >= MAX_TEMPLATES) return fail("too_many", 409);
    try {
      const template = await prisma.messageTemplate.create({ data: { workspaceId: who.workspaceId, ...body.data }, select: { id: true } });
      return ok({ id: template.id }, 201);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return fail("name_taken", 409);
      throw err;
    }
  });
}
