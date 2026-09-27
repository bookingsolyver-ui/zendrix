import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function AffiliatesPage({
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
        title={t("affiliatesTitle")}
        subtitle={t("affiliatesSubtitle")}
      />
      <DashboardEmptyState message={t("comingSoon")} />
    </>
  );
}
