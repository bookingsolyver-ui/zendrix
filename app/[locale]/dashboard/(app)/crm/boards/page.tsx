import { setRequestLocale } from "next-intl/server";
import { KanbanSquare, MessagesSquare, Plus, SlidersHorizontal, Bookmark } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { KanbanBoard } from "@/components/dashboard/crm/kanban-board";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { SoonButton } from "@/components/ui/soon-button";

const FEATURES = [
  { icon: KanbanSquare, title: "Quadro kanban", description: "Organize os cartões nas etapas que definir e mantenha cada tarefa a andar." },
  { icon: SlidersHorizontal, title: "Propriedades personalizáveis", description: "Estado, prioridade, datas, responsáveis e mais: adapte os cartões ao seu processo." },
  { icon: Bookmark, title: "Vistas guardadas", description: "Guarde filtros do quadro para cada rotina abrir exatamente onde precisa." },
  { icon: MessagesSquare, title: "Comentários e subtarefas", description: "Comente as tarefas junto da conversa de WhatsApp e divida o trabalho em subtarefas." },
];

export default async function CrmBoardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Quadros"
        subtitle="Tarefas, seguimentos e pedidos organizados num quadro ligado à sua caixa de entrada."
        action={
          <SoonButton
            feature="Nova tarefa"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Nova tarefa
          </SoonButton>
        }
      />

      <div className="space-y-8">
        <MarketingHero
          icon={KanbanSquare}
          title="Quadro de tarefas"
          description="Um quadro para a operação do seu negócio: seguimentos, pedidos e atendimento organizados num fluxo, ligado às conversas de WhatsApp."
          bullets={[
            "Etapas à sua medida: A fazer, Em curso, Concluído",
            "Responsáveis, prioridades e datas de entrega",
            "Tarefas ligadas à conversa do cliente",
          ]}
          cta="Nova tarefa"
        />

        <KanbanBoard />

        <FeatureGrid title="O que vai poder fazer" features={FEATURES} />
      </div>
    </>
  );
}
