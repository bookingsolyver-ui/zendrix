export type CampaignStatus = "sent" | "scheduled" | "draft";

export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  metricLabel: string | null;
  date: string | null;
};

export const CAMPAIGNS: Campaign[] = [
  {
    id: "black-friday",
    name: "Black Friday Antecipada",
    status: "sent",
    metricLabel: "85% Abertura",
    date: "22 Nov 2025",
  },
  {
    id: "dia-namorados",
    name: "Lembrete Dia dos Namorados",
    status: "scheduled",
    metricLabel: null,
    date: "10 Fev 2027",
  },
  {
    id: "reativacao-vip",
    name: "Reativação VIP",
    status: "draft",
    metricLabel: null,
    date: null,
  },
];

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  sent: "Enviada",
  scheduled: "Agendada",
  draft: "Rascunho",
};

export const STATUS_STYLES: Record<CampaignStatus, string> = {
  sent: "bg-emerald-500/10 text-emerald-400",
  scheduled: "bg-blue-500/10 text-blue-400",
  draft: "bg-white/10 text-white/50",
};
