import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { paymentItemInputSchema } from "@/lib/payments/catalog";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const MAX_ITEMS = 25; // o catálogo vai no prompt da IA: tem de ser curto

// Catálogo do que a IA pode vender. Só OWNER/MANAGER. O preço fica sempre guardado em cêntimos.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const body = paymentItemInputSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
    if ((await prisma.paymentItem.count({ where: { workspaceId: who.workspaceId } })) >= MAX_ITEMS) {
      return NextResponse.json({ success: false, error: "too_many_items" }, { status: 409 });
    }
    const item = await prisma.paymentItem.create({
      data: {
        workspaceId: who.workspaceId,
        name: body.data.name,
        description: body.data.description || null,
        amountMinor: body.data.amount,
        currency: body.data.currency,
        active: body.data.active ?? true,
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, id: item.id }, { status: 201 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/payment-items] POST falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
