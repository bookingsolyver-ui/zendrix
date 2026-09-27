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

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "novos-leads",
    title: "Novos Leads",
    cards: [
      {
        id: "deal-1",
        title: "Plano Pro — Loja XPTO",
        value: "Kz 150.000",
        assignee: "AM",
        tag: { label: "Vence hoje", tone: "danger" },
      },
      {
        id: "deal-2",
        title: "Upgrade Enterprise — Kandrop",
        value: "Kz 340.000",
        assignee: "JC",
        tag: { label: "Vence sexta", tone: "neutral" },
      },
      {
        id: "deal-3",
        title: "Consultoria inicial — Bazar Luanda",
        value: "Kz 45.000",
        assignee: "OL",
      },
    ],
  },
  {
    id: "em-negociacao",
    title: "Em negociação",
    cards: [
      {
        id: "deal-4",
        title: "Pacote Anual — TechStore",
        value: "Kz 520.000",
        assignee: "MS",
        tag: { label: "Vence hoje", tone: "danger" },
      },
      {
        id: "deal-5",
        title: "Plano Basic — Café Aurora",
        value: "Kz 89.000",
        assignee: "AM",
        tag: { label: "Vence sexta", tone: "neutral" },
      },
    ],
  },
  {
    id: "aguardando-pagamento",
    title: "Aguardando Pagamento",
    cards: [
      {
        id: "deal-6",
        title: "Renovação Pro — Boutique Nova",
        value: "Kz 210.000",
        assignee: "JC",
        tag: { label: "Vence sexta", tone: "neutral" },
      },
    ],
  },
  {
    id: "concluido",
    title: "Concluído",
    cards: [
      { id: "deal-7", title: "Onboarding — Mercado Central", value: "Kz 180.000", assignee: "OL" },
      { id: "deal-8", title: "Plano Pro — Farmácia Vida", value: "Kz 150.000", assignee: "MS" },
    ],
  },
];
