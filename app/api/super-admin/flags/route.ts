import { z } from "zod";
import { AuditLedger } from "@/lib/audit/ledger";
import { fail, ok } from "@/lib/http/route";
import { isKnownFlag } from "@/lib/superadmin/catalog";
import { TenantFlags } from "@/lib/superadmin/flags";
import { superAdminGuarded } from "@/lib/superadmin/guard";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

// Liga/desliga uma funcionalidade (ou a torneira «*») para UMA organização. Só o super-admin. Fica no livro de auditoria.
export async function POST(request: Request) {
  return superAdminGuarded(request, "flags", async (admin) => {
    const body = z.object({ workspaceId: z.string().min(1).max(40), flag: z.string().max(40), enabled: z.boolean(), reason: z.string().trim().max(200).optional() }).safeParse(await request.json().catch(() => null));
    if (!body.success || !isKnownFlag(body.data.flag)) return fail("invalid_input", 400);
    const { workspaceId, flag, enabled, reason } = body.data;
    if (!(await prisma.workspace.count({ where: { id: workspaceId } }))) return fail("not_found", 404);
    const previous = await prisma.kwanzaAdmin_FeatureFlag.findUnique({ where: { workspaceId_flag: { workspaceId, flag } }, select: { enabled: true } });
    await TenantFlags.set(workspaceId, flag, enabled, admin.email, reason);
    await AuditLedger.record({ workspaceId, actorId: admin.userId, ip: getClientIp(request) }, { entityType: "FeatureFlag", entityId: flag, action: previous ? "UPDATE" : "CREATE" }, { previous: previous ?? { enabled: true }, next: { enabled, reason: reason ?? null, by: admin.email } }, "sync");
    return ok();
  });
}
