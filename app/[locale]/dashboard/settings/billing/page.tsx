import { setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { CurrentPlanCard } from "@/components/dashboard/settings/billing/current-plan-card";
import { UsageBars } from "@/components/dashboard/settings/billing/usage-bars";
import { PaymentMethodCard } from "@/components/dashboard/settings/billing/payment-method-card";
import { InvoiceHistory } from "@/components/dashboard/settings/billing/invoice-history";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [sentThisMonth, teamMembers] = workspaceId
    ? await Promise.all([
        prisma.message.count({
          where: { workspaceId, direction: "OUT", createdAt: { gte: monthStart } },
        }),
        prisma.user.count({ where: { workspaceId } }),
      ])
    : [0, 0];

  return (
    <>
      <DashboardPageHeader
        title="Faturação e Subscrição"
        subtitle="Acompanhe o seu plano, uso e histórico de pagamentos com total transparência."
      />

      <div className="space-y-6">
        <CurrentPlanCard />
        <UsageBars
          items={[
            { label: "Mensagens de WhatsApp enviadas", value: String(sentThisMonth), hint: "Este mês" },
            { label: "Minutos de Áudio IA", value: "—", hint: "Ainda não medido" },
            { label: "Membros da equipa", value: String(teamMembers) },
          ]}
        />
        <PaymentMethodCard />
        <InvoiceHistory />
      </div>
    </>
  );
}
