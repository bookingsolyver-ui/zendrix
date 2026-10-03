import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { templateInputSchema } from "@/lib/templates/schema";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { idSchema } from "@/lib/validations/team";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "templates/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = templateInputSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);
    try {
      const { count } = await prisma.messageTemplate.updateMany({ where: { id: id.data, workspaceId: who.workspaceId }, data: body.data });
      return count > 0 ? ok() : fail("not_found", 404);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return fail("name_taken", 409);
      throw err;
    }
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "templates/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.messageTemplate.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}
