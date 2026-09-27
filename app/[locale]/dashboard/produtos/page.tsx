import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  return (
    <>
      <DashboardPageHeader
        title={t("productsTitle")}
        subtitle={t("productsSubtitle")}
      />
      <DashboardEmptyState message={t("comingSoon")} />
    </>
  );
}
