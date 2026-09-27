import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function CrmBoardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Quadros" subtitle="Organize oportunidades e tarefas em quadros Kanban." />
      <DashboardEmptyState message="Em construção — os dados aparecerão aqui em breve." />
    </>
  );
}
