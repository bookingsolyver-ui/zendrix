import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function AnalyticsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Analytics Geral" subtitle="Visão consolidada do desempenho do seu negócio." />
      <DashboardEmptyState message="Em construção — os dados aparecerão aqui em breve." />
    </>
  );
}
