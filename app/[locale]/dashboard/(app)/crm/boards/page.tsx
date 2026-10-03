import { setRequestLocale } from "next-intl/server";
import { KanbanSquare, MessagesSquare, SlidersHorizontal, Bookmark } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { KanbanBoard, type TaskView } from "@/components/dashboard/crm/kanban-board";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";

const FEATURES = [
  { icon: KanbanSquare, title: "Arrastar e largar", description: "Mova as tarefas entre etapas arrastando, ou pelo seletor do cartão, em ecrãs de toque." },
  { icon: SlidersHorizontal, title: "Prioridade e entrega", description: "Cada tarefa tem prioridade e data de entrega. As atrasadas ficam destacadas." },
  { icon: Bookmark, title: "Ordem guardada", description: "A posição de cada tarefa fica guardada e igual para toda a equipa." },
  { icon: MessagesSquare, title: "Para toda a equipa", description: "Todos os membros veem e atualizam o mesmo quadro." },
];

export default async function CrmBoardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const rows = user?.workspace
    ? await prisma.task.findMany({
        where: { workspaceId: user.workspace.id },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, description: true, status: true, priority: true, dueAt: true },
      })
    : [];
  const tasks: TaskView[] = rows.map((row) => ({ ...row, description: row.description ?? "", dueAt: row.dueAt ? row.dueAt.toISOString().slice(0, 10) : null }));

  return (
    <>
      <DashboardPageHeader
        title="Quadros"
        subtitle="Tarefas, seguimentos e pedidos organizados num quadro ligado à sua caixa de entrada."
      />

      <div className="space-y-8">
        <MarketingHero
          icon={KanbanSquare}
          title="Quadro de tarefas"
          description="Um quadro para a operação do seu negócio: seguimentos, pedidos e atendimento organizados num fluxo, ligado às conversas de WhatsApp."
          bullets={[
            "Três etapas: A fazer, Em curso e Concluído",
            "Prioridade e data de entrega em cada tarefa",
            "Alterações guardadas e partilhadas com a equipa",
          ]}
        />

        <KanbanBoard initialTasks={tasks} />

        <FeatureGrid title="Como funciona" features={FEATURES} />
      </div>
    </>
  );
}
