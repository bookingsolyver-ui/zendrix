import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { fail, MANAGERS } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { requireFeature } from "@/lib/superadmin/flags";

// Duplicados por rever, com os dois contactos lado a lado.
export async function GET(request: Request) {
  try {
    const who = await requireRole(MANAGERS, request);
    const off = await requireFeature(who.workspaceId, "data_cleaner");
    if (off) return off;
    const candidates = await prisma.duplicateCandidate.findMany({ where: { workspaceId: who.workspaceId, status: "PENDING" }, orderBy: { score: "desc" }, take: 100 });
    const ids = [...new Set(candidates.flatMap((c) => [c.primaryId, c.duplicateId]))];
    const contacts = await prisma.contact.findMany({ where: { workspaceId: who.workspaceId, id: { in: ids } }, select: { id: true, name: true, waId: true, email: true, leadStage: true, createdAt: true } });
    const byId = new Map(contacts.map((c) => [c.id, c]));
    const rows = candidates.flatMap((c) => {
      const primary = byId.get(c.primaryId);
      const duplicate = byId.get(c.duplicateId);
      return primary && duplicate ? [{ id: c.id, score: c.score, reasons: c.reasons, primary, duplicate }] : [];
    });
    return NextResponse.json({ success: true, candidates: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/data-cleaner] falhou", err);
    return fail("internal", 500);
  }
}
