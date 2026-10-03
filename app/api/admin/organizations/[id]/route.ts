import { after, NextResponse } from "next/server";
import { adminGuarded, logAdminAction } from "@/lib/admin/guard";
import { adminActionSchema, extendedTrialEnd } from "@/lib/admin/schema";
import { appOrigin } from "@/lib/http/origin";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { accountApprovedEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";
import { stripeGet } from "@/lib/stripe/client";
import { idSchema } from "@/lib/validations/team";

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

const SELECT = { subStatus: true, plan: true, trialEndsAt: true, blockedAt: true, approvalStatus: true, ownerEmail: true, name: true, stripeSubscriptionId: true } as const;
type Snapshot = { subStatus: string; plan: string | null; trialEndsAt: Date | null; blockedAt: Date | null; approvalStatus: string };
const snapshot = (w: Snapshot) => ({ subStatus: w.subStatus, plan: w.plan, trialEndsAt: w.trialEndsAt?.toISOString() ?? null, blocked: w.blockedAt !== null, approval: w.approvalStatus });

interface StripeSubscription {
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  items?: { data?: { current_period_end?: number | null }[] } | null;
}

// Ações do administrador da plataforma sobre UMA organização. Cada ação fica no registo de auditoria, com o estado
// antes e depois. A alteração manual do plano é uma correção (suporte, cortesia): se a organização tem uma
// subscrição no Stripe, o próximo evento do Stripe volta a ser a fonte da verdade.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return adminGuarded(request, "organizations/[id]", async (admin) => {
    const id = idSchema.safeParse((await params).id);
    const body = adminActionSchema.safeParse(await request.json().catch(() => null));
    if (!id.success || !body.success) return fail("invalid_input", 400);

    const before = await prisma.workspace.findUnique({ where: { id: id.data }, select: SELECT });
    if (!before) return fail("not_found", 404);
    const data = body.data;
    let extra: Record<string, unknown> = {};

    switch (data.action) {
      case "block":
        await prisma.workspace.update({ where: { id: id.data }, data: { blockedAt: new Date(), blockedReason: data.reason } });
        extra = { reason: data.reason };
        break;
      case "unblock":
        await prisma.workspace.update({ where: { id: id.data }, data: { blockedAt: null, blockedReason: null } });
        break;
      case "set_subscription":
        await prisma.workspace.update({ where: { id: id.data }, data: { subStatus: data.subStatus, plan: data.plan, trialEndsAt: data.subStatus === "trialing" ? extendedTrialEnd(null, data.trialDays ?? 14) : null } });
        break;
      case "extend_trial":
        if (before.subStatus !== "trialing") return fail("not_trialing", 409);
        await prisma.workspace.update({ where: { id: id.data }, data: { trialEndsAt: extendedTrialEnd(before.trialEndsAt, data.days) } });
        break;
      case "activate_subscription":
        await prisma.workspace.update({ where: { id: id.data }, data: { subStatus: "active", trialEndsAt: null } });
        break;
      case "suspend_subscription":
        await prisma.workspace.update({ where: { id: id.data }, data: { subStatus: "canceled" } });
        break;
      case "approve": {
        if (before.approvalStatus === "APPROVED") return fail("already_approved", 409);
        // O teste de 14 dias conta a partir da aprovação, não do registo (a espera não o gasta).
        await prisma.workspace.update({
          where: { id: id.data },
          data: { approvalStatus: "APPROVED", approvalDecidedAt: new Date(), approvalDecidedBy: admin.userId, approvalNote: null, ...(before.subStatus === "trialing" ? { trialEndsAt: extendedTrialEnd(null, 14) } : {}) },
        });
        extra = { notified: false };
        if (data.notify && before.ownerEmail && emailConfigured()) {
          const to = before.ownerEmail;
          const dashboardUrl = `${appOrigin(request)}/pt/dashboard`;
          const owner = await prisma.user.findFirst({ where: { workspaceId: id.data, role: "OWNER" }, select: { name: true } });
          after(async () => {
            await sendEmail({ to, ...accountApprovedEmail({ name: owner?.name, dashboardUrl, lang: "pt" }), idempotencyKey: `approved-${id.data}` });
          });
          extra = { notified: true };
        }
        break;
      }
      case "reject":
        if (before.approvalStatus !== "PENDING_APPROVAL") return fail("not_pending", 409);
        await prisma.workspace.update({ where: { id: id.data }, data: { approvalStatus: "REJECTED", approvalDecidedAt: new Date(), approvalDecidedBy: admin.userId, approvalNote: data.reason } });
        extra = { reason: data.reason };
        break;
      case "sync_stripe": {
        if (!before.stripeSubscriptionId) return fail("no_stripe_subscription", 409);
        let sub: StripeSubscription;
        try {
          sub = await stripeGet<StripeSubscription>(`/subscriptions/${encodeURIComponent(before.stripeSubscriptionId)}`);
        } catch {
          return fail("stripe_unavailable", 502);
        }
        const seconds = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
        await prisma.workspace.update({ where: { id: id.data }, data: { ...(typeof seconds === "number" ? { periodEnd: new Date(seconds * 1000) } : {}), cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end) } });
        extra = { periodEnd: typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null, cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end) };
        break;
      }
    }

    const after_ = await prisma.workspace.findUnique({ where: { id: id.data }, select: SELECT });
    await logAdminAction(admin, data.action, id.data, { before: snapshot(before), after: after_ ? snapshot(after_) : null, ...extra } as never);
    return NextResponse.json({ success: true });
  });
}
