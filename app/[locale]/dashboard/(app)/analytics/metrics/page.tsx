import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MetricCards } from "@/components/dashboard/analytics/metrics/metric-cards";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { TopAutomations } from "@/components/dashboard/analytics/metrics/top-automations";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const [delivered, read] = workspaceId
    ? await Promise.all([
        prisma.message.count({
          where: { workspaceId, direction: "OUT", status: { in: ["DELIVERED", "READ"] } },
        }),
        prisma.message.count({ where: { workspaceId, direction: "OUT", status: "READ" } }),
      ])
    : [0, 0];

  return (
    <>
      <DashboardPageHeader
        title="Métricas"
        subtitle="Indicadores-chave de desempenho da sua operação de mensagens."
      />

      <div className="space-y-6">
        <MetricCards metrics={{ delivered, read }} />
        <TopAutomations />
      </div>
    </>
  );
}
