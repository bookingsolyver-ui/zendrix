import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { paymentItemInputSchema } from "@/lib/payments/catalog";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { idSchema } from "@/lib/validations/team";

const patchSchema = paymentItemInputSchema.partial();

// Editar, ativar/desativar e apagar um item. Sempre dentro da organização da sessão. Os links já enviados guardam
// uma fotografia do item (nome e valor), por isso editar ou apagar não os altera.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const id = idSchema.safeParse((await params).id);
    const body = patchSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

    const { count } = await prisma.paymentItem.updateMany({
      where: { id: id.data, workspaceId: who.workspaceId },
      data: {
        ...(body.data.name !== undefined ? { name: body.data.name } : {}),
        ...(body.data.description !== undefined ? { description: body.data.description || null } : {}),
        ...(body.data.amount !== undefined ? { amountMinor: body.data.amount } : {}),
        ...(body.data.currency !== undefined ? { currency: body.data.currency } : {}),
        ...(body.data.active !== undefined ? { active: body.data.active } : {}),
      },
    });
    return count > 0 ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/payment-items] PATCH falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
    const { count } = await prisma.paymentItem.deleteMany({ where: { id: id.data, workspaceId: who.workspaceId } });
    return count > 0 ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/payment-items] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
