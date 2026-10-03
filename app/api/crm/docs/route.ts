import { prisma } from "@/lib/prisma";
import { MAX_DOCS, docInputSchema } from "@/lib/crm/schemas";
import { ALL_ROLES, fail, guarded, ok } from "@/lib/http/route";

async function editorName(workspaceId: string, email?: string) {
  if (!email) return null;
  const user = await prisma.user.findFirst({ where: { workspaceId, email }, select: { name: true } });
  return user?.name || email;
}

export async function POST(request: Request) {
  return guarded(request, ALL_ROLES, "crm/docs", async (who) => {
    const body = docInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    if ((await prisma.doc.count({ where: { workspaceId: who.workspaceId } })) >= MAX_DOCS) return fail("too_many", 409);
    const doc = await prisma.doc.create({
      data: { workspaceId: who.workspaceId, title: body.data.title, body: body.data.body, lastEditedBy: await editorName(who.workspaceId, who.userEmail) },
      select: { id: true },
    });
    return ok({ id: doc.id }, 201);
  });
}
