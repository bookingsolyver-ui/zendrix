import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { requireRole } from "@/lib/rbac";
import { cancelAppointment } from "@/lib/schedule/service";
import { idSchema } from "@/lib/validations/team";

// Cancelar uma marcação: a hora volta a estar livre para a IA a oferecer. Só OWNER/MANAGER.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
    return (await cancelAppointment(who.workspaceId, id.data))
      ? NextResponse.json({ success: true })
      : NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/appointments] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
