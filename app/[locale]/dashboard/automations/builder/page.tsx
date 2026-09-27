import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { FlowBuilder } from "@/components/dashboard/automations/flow-builder";

export default async function AutomationBuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Construtor de Automações"
        subtitle="Desenhe fluxos visuais que trabalham por si, 24 horas por dia."
      />
      <FlowBuilder />
    </>
  );
}
