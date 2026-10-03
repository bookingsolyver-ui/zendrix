import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/contacts/phone";
import { ALL_ROLES, fail, guarded, ok } from "@/lib/http/route";

const inputSchema = z.object({
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(1).max(30),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
});

// Novo contacto à mão (WhatsApp): o número é a identidade da pessoa. Se já existir, não duplica.
export async function POST(request: Request) {
  return guarded(request, ALL_ROLES, "contacts", async (who) => {
    const body = inputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const waId = normalizePhone(body.data.phone);
    if (!waId) return fail("invalid_phone", 400);
    try {
      const contact = await prisma.contact.create({
        data: { workspaceId: who.workspaceId, platform: "WHATSAPP", waId, name: body.data.name || null, email: body.data.email ? body.data.email.toLowerCase() : null },
        select: { id: true },
      });
      return ok({ id: contact.id }, 201);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return fail("already_exists", 409);
      throw err;
    }
  });
}
