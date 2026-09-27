export type Doc = {
  id: string;
  title: string;
  updatedAt: string;
  editor: string;
};

export const DOCS: Doc[] = [
  { id: "doc-1", title: "Script de Vendas", updatedAt: "há 2 dias", editor: "Ana Martins" },
  { id: "doc-2", title: "Política de Reembolso", updatedAt: "há 1 semana", editor: "Filipe Oliveira" },
  { id: "doc-3", title: "FAQ de Produtos", updatedAt: "há 3 dias", editor: "João Costa" },
  { id: "doc-4", title: "Guião de Atendimento WhatsApp", updatedAt: "há 5 dias", editor: "Marta Silva" },
  { id: "doc-5", title: "Onboarding de Novos Clientes", updatedAt: "há 1 mês", editor: "Ana Martins" },
];
