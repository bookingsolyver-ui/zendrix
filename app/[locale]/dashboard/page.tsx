import { setRequestLocale } from "next-intl/server";
import { TrialBanner } from "@/components/dashboard/overview/trial-banner";
import { DashboardFilters } from "@/components/dashboard/overview/dashboard-filters";
import { WhatsappGate } from "@/components/dashboard/overview/whatsapp-gate";
import { FaqVideoSection } from "@/components/dashboard/overview/faq-video-section";
import { msUntil } from "@/lib/trial";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWhatsAppStatus } from "@/lib/whatsapp/status";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const whatsapp = await getWhatsAppStatus(user?.workspace?.id);

  return (
    <>
      {user?.workspace && (
        <TrialBanner
          subStatus={user.workspace.subStatus}
          msLeft={msUntil(user.workspace.trialEndsAt)}
        />
      )}
      <DashboardFilters />
      <WhatsappGate connected={whatsapp.connected} />

      <div className="mt-6">
        <FaqVideoSection />
      </div>
    </>
  );
}
