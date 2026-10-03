import { setRequestLocale } from "next-intl/server";
import { msUntil } from "@/lib/trial";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { CurrentPlanCard } from "@/components/dashboard/settings/billing/current-plan-card";
import { UsageBars } from "@/components/dashboard/settings/billing/usage-bars";
import { PaymentMethodCard } from "@/components/dashboard/settings/billing/payment-method-card";
import { InvoiceHistory } from "@/components/dashboard/settings/billing/invoice-history";
import { CheckoutBanner } from "@/components/dashboard/settings/billing/checkout-banner";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { checkout } = await searchParams;
  const checkoutResult = checkout === "success" || checkout === "canceled" ? checkout : null;

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  // Só OWNER e MANAGER gerem a faturação (a API também o exige: isto só decide o que se mostra).
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";

  const [sentThisMonth, teamMembers, billing] = workspaceId
    ? await Promise.all([
        prisma.message.count({
          where: {
            workspaceId,
            direction: "OUT",
            createdAt: { gte: monthStart },
          },
        }),
        prisma.user.count({ where: { workspaceId } }),
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { stripeCustomerId: true, stripeSubscriptionId: true },
        }),
      ])
    : [0, 0, null];
  const hasBillingAccount = Boolean(billing?.stripeCustomerId);

  return (
    <>
      <DashboardPageHeader
        title="Faturação e Subscrição"
        subtitle="Acompanhe o seu plano, uso e histórico de pagamentos com total transparência."
      />

      <div className="space-y-6">
        {checkoutResult && (
          <CheckoutBanner result={checkoutResult} subscriptionLinked={Boolean(billing?.stripeSubscriptionId)} />
        )}
        {user?.workspace && (
          <CurrentPlanCard
            subStatus={user.workspace.subStatus}
            plan={user.workspace.plan}
            trialEndsAt={user.workspace.trialEndsAt}
            msLeft={msUntil(user.workspace.trialEndsAt)}
            canManage={canManage}
            hasBillingAccount={hasBillingAccount}
          />
        )}
        <UsageBars
          items={[
            {
              label: "Mensagens de WhatsApp enviadas",
              value: String(sentThisMonth),
              hint: "Este mês",
            },
            {
              label: "Minutos de Áudio IA",
              value: "—",
              hint: "Ainda não medido",
            },
            { label: "Membros da equipa", value: String(teamMembers) },
          ]}
        />
        <PaymentMethodCard canManage={canManage} hasBillingAccount={hasBillingAccount} />
        <InvoiceHistory canManage={canManage} hasBillingAccount={hasBillingAccount} />
      </div>
    </>
  );
}
