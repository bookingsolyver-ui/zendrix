import { NextResponse } from "next/server";
import { adminGuarded, logAdminAction } from "@/lib/admin/guard";
import { adminActionSchema, extendedTrialEnd } from "@/lib/admin/schema";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validations/team";

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

// Ações do administrador da plataforma sobre UMA organização. Cada ação fica no registo de auditoria, com o estado
// antes e depois. A alteração manual do plano é uma correção (suporte, cortesia): se a organização tem uma
// subscrição no Stripe, o próximo evento do Stripe volta a ser a fonte da verdade.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminGuarded(request, "organizations/[id]", async (admin) => {
    const id = idSchema.safeParse((await params).id);
    const body = adminActionSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);

    const before = await prisma.workspace.findUnique({ where: { id: id.data }, select: { subStatus: true, plan: true, trialEndsAt: true, blockedAt: true } });
    if (!before) return fail("not_found", 404);
    const snapshot = (w: typeof before) => ({ subStatus: w.subStatus, plan: w.plan, trialEndsAt: w.trialEndsAt?.toISOString() ?? null, blocked: w.blockedAt !== null });

    const data = body.data;
    if (data.action === "block") {
      await prisma.workspace.update({ where: { id: id.data }, data: { blockedAt: new Date(), blockedReason: data.reason } });
    } else if (data.action === "unblock") {
      await prisma.workspace.update({ where: { id: id.data }, data: { blockedAt: null, blockedReason: null } });
    } else if (data.action === "set_subscription") {
      await prisma.workspace.update({
        where: { id: id.data },
        data: { subStatus: data.subStatus, plan: data.plan, trialEndsAt: data.subStatus === "trialing" ? extendedTrialEnd(null, data.trialDays ?? 14) : null },
      });
    } else {
      if (before.subStatus !== "trialing") return fail("not_trialing", 409);
      await prisma.workspace.update({ where: { id: id.data }, data: { trialEndsAt: extendedTrialEnd(before.trialEndsAt, data.days) } });
    }

    const after = await prisma.workspace.findUnique({ where: { id: id.data }, select: { subStatus: true, plan: true, trialEndsAt: true, blockedAt: true } });
    await logAdminAction(admin, data.action, id.data, { before: snapshot(before), after: after ? snapshot(after) : null, ...(data.action === "block" ? { reason: data.reason } : {}) });
    return NextResponse.json({ success: true });
  });
}
