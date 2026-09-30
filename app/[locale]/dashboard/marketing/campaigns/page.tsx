import { setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MetricTiles } from "@/components/dashboard/marketing/campaigns/metric-tiles";
import { CampaignsTable } from "@/components/dashboard/marketing/campaigns/campaigns-table";
import { SoonButton } from "@/components/ui/soon-button";

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Campanhas em Massa"
        subtitle="Envie campanhas segmentadas por WhatsApp e acompanhe o desempenho em tempo real."
        action={
          <SoonButton feature="Nova Campanha"
            type="button"
            className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-4 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
          >
            <Plus className="h-4 w-4" />
            Nova Campanha
          </SoonButton>
        }
      />

      <MetricTiles />

      <div className="mt-6">
        <CampaignsTable />
      </div>
    </>
  );
}
