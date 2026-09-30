import { setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { KanbanBoard } from "@/components/dashboard/crm/kanban-board";
import { SoonButton } from "@/components/ui/soon-button";

export default async function CrmBoardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Quadros"
        subtitle="Organize oportunidades e negócios em quadros Kanban."
        action={
          <SoonButton feature="Novo Negócio"
            type="button"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Novo Negócio
          </SoonButton>
        }
      />
      <KanbanBoard />
    </>
  );
}
