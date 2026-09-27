import { setRequestLocale } from "next-intl/server";
import { Receipt, TicketPercent, Wallet } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DateRangeFilter } from "@/components/dashboard/analytics/date-range-filter";
import { KpiCard } from "@/components/dashboard/analytics/kpi-card";
import { RevenueChartPlaceholder } from "@/components/dashboard/analytics/revenue-chart-placeholder";

export default async function AnalyticsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Analytics"
        subtitle="Visão consolidada do desempenho do seu negócio."
        action={<DateRangeFilter />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={Wallet} label="Receita Total" value="Kz 2.480.000" trend="+15% vs mês passado" />
        <KpiCard
          icon={TicketPercent}
          label="Conversão de Checkouts"
          value="4,8%"
          trend="+8% vs mês passado"
        />
        <KpiCard icon={Receipt} label="Ticket Médio" value="Kz 38.500" trend="+15% vs mês passado" />
      </div>

      <div className="mt-6">
        <RevenueChartPlaceholder />
      </div>
    </>
  );
}
