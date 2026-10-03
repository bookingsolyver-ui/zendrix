import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { idSchema } from "@/lib/validations/team";

// Revogar um convite pendente: o link deixa de funcionar de imediato. Só OWNER/MANAGER.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

    const invite = await prisma.teamInvite.findFirst({
      where: { id: id.data, workspaceId: who.workspaceId, acceptedAt: null, revokedAt: null },
      select: { role: true },
    });
    if (!invite) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
    // Um MANAGER só revoga convites de Agentes, tal como só os cria.
    if (who.role !== "OWNER" && invite.role !== "STAFF") {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }
    await prisma.teamInvite.updateMany({
      where: { id: id.data, workspaceId: who.workspaceId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/team/invites] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
