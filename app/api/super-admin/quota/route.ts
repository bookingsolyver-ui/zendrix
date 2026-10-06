import { z } from "zod";
import { AuditLedger } from "@/lib/audit/ledger";
import { fail, ok } from "@/lib/http/route";
import { superAdminGuarded } from "@/lib/superadmin/guard";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

// Limite diário de IA próprio para uma organização (null = volta ao limite global). Só o super-admin.
export async function POST(request: Request) {
  return superAdminGuarded(request, "quota", async (admin) => {
    const body = z.object({ workspaceId: z.string().min(1).max(40), dailyLimit: z.number().int().min(1).max(1_000_000).nullable() }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const { workspaceId, dailyLimit } = body.data;
    if (!(await prisma.workspace.count({ where: { id: workspaceId } }))) return fail("not_found", 404);
    if (dailyLimit === null) await prisma.zetrixAdmin_QuotaOverride.deleteMany({ where: { workspaceId, metric: "ai_calls" } });
    else await prisma.zetrixAdmin_QuotaOverride.upsert({ where: { workspaceId_metric: { workspaceId, metric: "ai_calls" } }, create: { workspaceId, metric: "ai_calls", dailyLimit, updatedBy: admin.email }, update: { dailyLimit, updatedBy: admin.email } });
    await AuditLedger.record({ workspaceId, actorId: admin.userId, ip: getClientIp(request) }, { entityType: "QuotaOverride", entityId: "ai_calls", action: "UPDATE" }, { next: { dailyLimit, by: admin.email } }, "sync");
    return ok();
  });
}
