import { prisma } from "@/lib/prisma";
import { segmentInputSchema } from "@/lib/segments/rules";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { idSchema } from "@/lib/validations/team";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "segments/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = segmentInputSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);
    const { count } = await prisma.segment.updateMany({
      where: { id: id.data, workspaceId: who.workspaceId },
      data: { name: body.data.name, description: body.data.description || null, rules: body.data.rules },
    });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "segments/[id]", async (who) => {
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return fail("invalid_input", 400);
    const { count } = await prisma.segment.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? ok() : fail("not_found", 404);
  });
}
