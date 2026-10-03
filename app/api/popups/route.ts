import { randomBytes } from "node:crypto";
import { MAX_POPUPS, popupInputSchema } from "@/lib/popups/schema";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";

// Criar um popup (nasce desligado: o dono revê, cola o script e liga). Só proprietário e gestores.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "popups", async (who) => {
    const body = popupInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    if ((await prisma.popup.count({ where: { workspaceId: who.workspaceId } })) >= MAX_POPUPS) return fail("too_many", 409);
    const popup = await prisma.popup.create({
      data: { workspaceId: who.workspaceId, publicKey: randomBytes(12).toString("base64url"), name: body.data.name, config: body.data.config },
      select: { id: true },
    });
    return ok({ id: popup.id }, 201);
  });
}
