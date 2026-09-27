import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TrackingTable } from "@/components/dashboard/ecommerce/tracking/tracking-table";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Rastreio de Encomendas"
        subtitle="Acompanhe o estado de envio de todas as encomendas da sua loja."
      />
      <TrackingTable />
    </>
  );
}
