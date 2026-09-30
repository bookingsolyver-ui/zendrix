import { setRequestLocale } from "next-intl/server";
import { Layers, Smartphone } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/billing/summary-card";
import { WhatsAppTopLinks } from "@/components/dashboard/whatsapp/top-links";
import { PurchaseSection } from "@/components/dashboard/whatsapp/purchase-section";
import { VideoBlock } from "@/components/dashboard/whatsapp/video-block";
import { HowItWorksAccordion } from "@/components/dashboard/whatsapp/how-it-works-accordion";
import { DedicatedNumberSection } from "@/components/whatsapp/dedicated-number-section";
import { UpdateTokenForm } from "@/components/whatsapp/update-token-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWhatsAppStatus } from "@/lib/whatsapp/status";

const PLAN_SEATS = 3;

export default async function WhatsAppSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const { count } = await getWhatsAppStatus(user?.workspace?.id);

  return (
    <>
      <DashboardPageHeader
        title="WhatsApp"
        subtitle="Ligue e gira os números de WhatsApp Business da sua conta."
        action={<WhatsAppTopLinks />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={Smartphone}
          label="Números conectados"
          value={String(count)}
          hint={count === 0 ? "Nenhum número ligado ainda" : "Número ligado à sua conta"}
        />
        <SummaryCard
          icon={Layers}
          label="Vagas do plano"
          value={`${count} / ${PLAN_SEATS}`}
          hint={`${Math.max(PLAN_SEATS - count, 0)} vagas livres no plano Pro`}
          accent
        />
      </div>

      {count > 0 && (
        <div className="mt-6">
          <UpdateTokenForm />
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Número dedicado</h2>
        <p className="mt-1 text-sm text-muted">
          Ligue um número que já é seu à API oficial do WhatsApp.
        </p>
        <div className="mt-5">
          <DedicatedNumberSection />
        </div>
      </div>

      <div className="mt-10">
        <PurchaseSection />
      </div>

      <div className="mt-10">
        <VideoBlock />
      </div>

      <div className="mt-10">
        <HowItWorksAccordion />
      </div>
    </>
  );
}
