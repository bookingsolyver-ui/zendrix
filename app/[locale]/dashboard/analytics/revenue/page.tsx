import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { RevenueHero } from "@/components/dashboard/analytics/revenue/revenue-hero";
import { RevenueChart } from "@/components/dashboard/analytics/revenue/revenue-chart";
import { ChannelTable } from "@/components/dashboard/analytics/revenue/channel-table";

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Receita"
        subtitle="Acompanhe a evolução da receita ao longo do tempo."
      />

      <div className="space-y-6">
        <RevenueHero />
        <RevenueChart />
        <ChannelTable />
      </div>
    </>
  );
}
