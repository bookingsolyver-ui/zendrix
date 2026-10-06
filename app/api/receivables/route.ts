import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/api-auth";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { requireFeature } from "@/lib/superadmin/flags";

const createSchema = z.object({
  contactId: z.string().trim().min(1).max(40),
  reference: z.string().trim().min(1).max(60), // número da fatura
  description: z.string().trim().max(200).optional(),
  amountMinor: z.number().int().positive().max(1_000_000_000_000),
  currency: z.string().trim().length(3).transform((c) => c.toUpperCase()),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((d) => new Date(`${d}T23:59:59.000Z`)),
  paymentReference: z.string().trim().max(80).optional(),
});

export async function GET(request: Request) {
  try {
    const who = await requireRole(MANAGERS, request);
    const off = await requireFeature(who.workspaceId, "cash_collector");
    if (off) return off;
    const rows = await prisma.receivable.findMany({ where: { workspaceId: who.workspaceId }, orderBy: [{ status: "asc" }, { dueAt: "asc" }], take: 200 });
    return NextResponse.json({ success: true, receivables: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/receivables] falhou", err);
    return fail("internal", 500);
  }
}

export async function POST(request: Request) {
  return guarded(request, MANAGERS, "receivables", async (who) => {
    const off = await requireFeature(who.workspaceId, "cash_collector");
    if (off) return off;
    const body = createSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const contact = await prisma.contact.findFirst({ where: { id: body.data.contactId, workspaceId: who.workspaceId }, select: { id: true } });
    if (!contact) return fail("not_found", 404);
    try {
      const row = await prisma.receivable.create({ data: { workspaceId: who.workspaceId, ...body.data } });
      return ok({ id: row.id }, 201);
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return fail("already_exists", 409);
      throw err;
    }
  });
}
