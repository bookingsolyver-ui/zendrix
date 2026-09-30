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

// The pipeline stages are the structure; there is no deals table yet, so every column is empty.
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "novos-leads", title: "Novos Leads", cards: [] },
  { id: "em-negociacao", title: "Em negociação", cards: [] },
  { id: "aguardando-pagamento", title: "Aguardando Pagamento", cards: [] },
  { id: "concluido", title: "Concluído", cards: [] },
];
