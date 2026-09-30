export type TemplateStatus = "approved" | "review" | "rejected";

export type MessageTemplate = {
  id: string;
  name: string;
  language: string;
  status: TemplateStatus;
  preview: string;
};

export const TEMPLATES: MessageTemplate[] = [];

export const STATUS_LABELS: Record<TemplateStatus, string> = {
  approved: "Aprovado",
  review: "Em análise",
  rejected: "Rejeitado",
};

export const STATUS_STYLES: Record<TemplateStatus, string> = {
  approved: "bg-emerald-500/10 text-emerald-400",
  review: "bg-amber-500/10 text-amber-400",
  rejected: "bg-red-500/10 text-red-400",
};
