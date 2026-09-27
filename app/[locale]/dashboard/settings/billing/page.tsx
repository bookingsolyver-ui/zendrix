import { setRequestLocale } from "next-intl/server";
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

  return (
    <>
      <DashboardPageHeader
        title="Faturação e Subscrição"
        subtitle="Acompanhe o seu plano, uso e histórico de pagamentos com total transparência."
      />

      <div className="space-y-6">
        <CurrentPlanCard />
        <UsageBars />
        <PaymentMethodCard />
        <InvoiceHistory />
      </div>
    </>
  );
}
