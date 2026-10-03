import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { scheduleConfigSchema } from "@/lib/schedule/config";

// Guarda a configuração (schedule) da organização. Só OWNER/MANAGER. Validada de forma estrita: o servidor nunca
// grava uma configuração que o motor depois não saiba cumprir (ver o schema).
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const body = scheduleConfigSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json(
        { success: false, error: "invalid_config", issues: body.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) },
        { status: 400 },
      );
    }
    await prisma.workspace.update({ where: { id: who.workspaceId }, data: { scheduleConfig: body.data } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/settings/schedule] PUT falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
