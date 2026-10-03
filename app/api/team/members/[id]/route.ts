import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { canManageRole } from "@/lib/roles";
import { deleteAuthUsers } from "@/lib/supabase/admin";
import { idSchema, memberRoleSchema } from "@/lib/validations/team";

// Gestão de membros da equipa. O alvo é sempre procurado DENTRO da organização da sessão (um id de outra
// organização é um 404), ninguém se gere a si próprio e ninguém gere um OWNER.

async function loadTarget(rawId: string, workspaceId: string, selfEmail: string | undefined) {
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { error: NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 }) };
  const target = await prisma.user.findFirst({
    where: { id: id.data, workspaceId },
    select: { id: true, email: true, role: true, authId: true },
  });
  if (!target) return { error: NextResponse.json({ success: false, error: "not_found" }, { status: 404 }) };
  if (selfEmail && target.email === selfEmail) {
    return { error: NextResponse.json({ success: false, error: "cannot_manage_self" }, { status: 403 }) };
  }
  return { target };
}

// Mudar o papel de um membro (MANAGER <-> STAFF). Só o OWNER.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER"]);
    const body = memberRoleSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

    const loaded = await loadTarget((await params).id, who.workspaceId, who.userEmail);
    if (loaded.error) return loaded.error;
    if (!canManageRole(who.role, loaded.target.role)) {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }
    await prisma.user.update({ where: { id: loaded.target.id }, data: { role: body.data.role } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/team/members] PATCH falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}

// Remover um membro da equipa. OWNER remove MANAGER/STAFF; MANAGER remove STAFF. Apaga também a conta de Auth
// da pessoa: senão, ao iniciar sessão, ficava com uma organização nova só sua.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const loaded = await loadTarget((await params).id, who.workspaceId, who.userEmail);
    if (loaded.error) return loaded.error;
    const { target } = loaded;
    if (!canManageRole(who.role, target.role)) {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    await prisma.user.deleteMany({ where: { id: target.id, workspaceId: who.workspaceId } });
    const authLeft = target.authId ? await deleteAuthUsers([target.authId]) : 0;
    return NextResponse.json({ success: true, authAccountRemoved: authLeft === 0 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/team/members] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
