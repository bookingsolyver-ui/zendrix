import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function MarketingCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Campanhas" subtitle="Crie e acompanhe campanhas de marketing multicanal." />
      <DashboardEmptyState message="Em construção — os dados aparecerão aqui em breve." />
    </>
  );
}
