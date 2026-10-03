import { prisma } from "@/lib/prisma";
import { segmentInputSchema } from "@/lib/segments/rules";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";

const MAX_SEGMENTS = 50;

export async function POST(request: Request) {
  return guarded(request, MANAGERS, "segments", async (who) => {
    const body = segmentInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    if ((await prisma.segment.count({ where: { workspaceId: who.workspaceId } })) >= MAX_SEGMENTS) return fail("too_many", 409);
    const segment = await prisma.segment.create({
      data: { workspaceId: who.workspaceId, name: body.data.name, description: body.data.description || null, rules: body.data.rules },
      select: { id: true },
    });
    return ok({ id: segment.id }, 201);
  });
}
