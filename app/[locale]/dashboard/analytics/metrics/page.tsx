import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MetricCards } from "@/components/dashboard/analytics/metrics/metric-cards";
import { TopAutomations } from "@/components/dashboard/analytics/metrics/top-automations";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Métricas"
        subtitle="Indicadores-chave de desempenho da sua operação de mensagens."
      />

      <div className="space-y-6">
        <MetricCards />
        <TopAutomations />
      </div>
    </>
  );
}
