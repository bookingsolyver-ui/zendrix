import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function MarketingPopupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Popups" subtitle="Capte leads com popups e formulários no seu site." />
      <DashboardEmptyState message="Em construção — os dados aparecerão aqui em breve." />
    </>
  );
}
