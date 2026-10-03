export type UrgencyTag = { label: string; tone: "danger" | "neutral" };

export type DealCard = {
  id: string;
  title: string;
  value: string;
  assignee: string;
  tag?: UrgencyTag;
};

export type KanbanColumn = {
  id: string;
  title: string;
  cards: DealCard[];
};

// As etapas são a estrutura; ainda não há tabela de tarefas, por isso todas as colunas estão vazias.
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "a-fazer", title: "A fazer", cards: [] },
  { id: "em-curso", title: "Em curso", cards: [] },
  { id: "concluido", title: "Concluído", cards: [] },
];
