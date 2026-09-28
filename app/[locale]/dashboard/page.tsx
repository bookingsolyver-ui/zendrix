import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { KpiCards } from "@/components/dashboard/overview/kpi-cards";
import { RevenueEvolutionChart } from "@/components/dashboard/overview/revenue-evolution-chart";
import { LiveActivityFeed } from "@/components/dashboard/overview/live-activity-feed";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Visão geral"
        subtitle="Bem-vindo de volta. Aqui está o resumo do seu negócio."
      />

      <div className="space-y-6">
        <KpiCards />
        <RevenueEvolutionChart />
        <LiveActivityFeed />
      </div>
    </>
  );
}
