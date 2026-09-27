import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AiSummaryCards } from "@/components/dashboard/ai/overview/summary-cards";
import { RecentConversations } from "@/components/dashboard/ai/overview/recent-conversations";

export default async function AiOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Desempenho do Assistente IA"
        subtitle="Acompanhe como o seu assistente de IA está a atender os seus clientes."
      />

      <div className="space-y-6">
        <AiSummaryCards />
        <RecentConversations />
      </div>
    </>
  );
}
