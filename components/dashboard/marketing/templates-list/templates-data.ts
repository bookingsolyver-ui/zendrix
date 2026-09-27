export type TemplateStatus = "approved" | "review" | "rejected";

export type MessageTemplate = {
  id: string;
  name: string;
  language: string;
  status: TemplateStatus;
  preview: string;
};

export const TEMPLATES: MessageTemplate[] = [
  {
    id: "carrinho_recuperado_v1",
    name: "carrinho_recuperado_v1",
    language: "pt_PT",
    status: "approved",
    preview: "Olá {{1}}, deixaste algo no carrinho! Usa o código {{2}} e ganha 10% de desconto. 🛒",
  },
  {
    id: "boas_vindas_v2",
    name: "boas_vindas_v2",
    language: "pt_PT",
    status: "approved",
    preview: "Olá {{1}}! Bem-vindo à nossa loja. Estamos aqui para ajudar sempre que precisares. 👋",
  },
  {
    id: "confirmacao_pedido_v1",
    name: "confirmacao_pedido_v1",
    language: "pt_PT",
    status: "approved",
    preview: "O teu pedido #{{1}} foi confirmado! Vais receber uma notificação assim que for enviado.",
  },
  {
    id: "promocao_black_friday",
    name: "promocao_black_friday",
    language: "pt_PT",
    status: "review",
    preview: "🔥 Black Friday chegou! Até 50% de desconto em toda a loja. Válido até {{1}}.",
  },
  {
    id: "cobranca_atraso_v1",
    name: "cobranca_atraso_v1",
    language: "pt_PT",
    status: "rejected",
    preview: "Olá {{1}}, notamos que o pagamento do pedido #{{2}} está em atraso...",
  },
];

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
