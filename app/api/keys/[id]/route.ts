import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { apiKeyIdSchema } from "@/lib/validations/api-keys";

// Revoga uma chave (efeito imediato). Fica registada como revogada, não é apagada.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const id = apiKeyIdSchema.safeParse((await params).id);
    if (!id.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

    const key = await prisma.apiKey.findFirst({
      where: { id: id.data, workspaceId: who.workspaceId },
      select: { role: true, revokedAt: true },
    });
    if (!key) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
    // Um MANAGER só revoga chaves STAFF, tal como só as cria.
    if (who.role !== "OWNER" && key.role !== "STAFF") {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    if (!key.revokedAt) {
      await prisma.apiKey.updateMany({
        where: { id: id.data, workspaceId: who.workspaceId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/keys] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
