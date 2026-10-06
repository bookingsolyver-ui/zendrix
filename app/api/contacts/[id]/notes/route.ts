import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { fail, ALL_ROLES } from "@/lib/http/route";
import { Fortress } from "@/lib/fortress/service";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

// Notas de um contacto (as de voz do WhatsApp, as da importação...), da mais recente para a mais antiga.
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const who = await requireRole(ALL_ROLES, request);
    const { id } = await ctx.params;
    // Fortress: vendedores só veem clientes atribuídos; abrir perfis em massa bloqueia a conta (429).
    const scope = await Fortress.contactScope(who);
    if (scope.kind === "none" || (scope.kind === "assigned" && !scope.contactIds.includes(id))) return fail("forbidden", 403);
    const blocked = await Fortress.guardProfileAccess(who);
    if (blocked) return blocked;
    const notes = await prisma.contactNote.findMany({
      where: { workspaceId: who.workspaceId, contactId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, source: true, body: true, createdAt: true },
    });
    return NextResponse.json({ success: true, notes }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/contacts/notes] falhou", err);
    return fail("internal", 500);
  }
}
