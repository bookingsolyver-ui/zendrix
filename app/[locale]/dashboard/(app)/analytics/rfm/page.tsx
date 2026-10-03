import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { RfmBoard } from "@/components/dashboard/analytics/rfm/rfm-board";

export default async function AnalyticsRfmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Segmentação RFM"
        subtitle="Recência, Frequência e Valor Monetário — identifique e ative cada segmento de clientes."
      />
      <RfmBoard />
    </>
  );
}
