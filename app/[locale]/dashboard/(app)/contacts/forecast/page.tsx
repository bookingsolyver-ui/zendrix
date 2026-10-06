import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ForecastPanel } from "@/components/dashboard/import/forecast-panel";

// Predictive CFO: página nova (ver docs/zetrix-clevel.md para o link).
export default async function ForecastPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div>
      <DashboardPageHeader title="Previsão de receita" subtitle="O que esperamos receber no próximo mês, ponderado pelo risco de cada cliente." />
      <ForecastPanel />
    </div>
  );
}
