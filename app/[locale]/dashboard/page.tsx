import { setRequestLocale } from "next-intl/server";
import { TrialBanner } from "@/components/dashboard/overview/trial-banner";
import { DashboardFilters } from "@/components/dashboard/overview/dashboard-filters";
import { WhatsappEmptyState } from "@/components/dashboard/overview/whatsapp-empty-state";
import { FaqVideoSection } from "@/components/dashboard/overview/faq-video-section";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <TrialBanner />
      <DashboardFilters />
      <WhatsappEmptyState />

      <div className="mt-6">
        <FaqVideoSection />
      </div>
    </>
  );
}
