// Máquina de estados do funil (Contact.leadStage). Puro (sem servidor): testável.
// «Fechado Ganho» = WON. WON é terminal (como em lib/leads/lead.ts) e é o único estado que dispara o handoff.
export const STAGES = ["NEW", "ENGAGED", "QUALIFIED", "PAYMENT_SENT", "WON", "LOST"] as const;
export type Stage = (typeof STAGES)[number];

export const DEPARTMENTS = ["FINANCE", "LOGISTICS"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const HANDOFF_TASKS: Record<Department, { title: (client: string) => string; description: string; dueInDays: number }> = {
  FINANCE: { title: (c) => `[Financeiro] Faturar: ${c}`, description: "Venda ganha. Emitir a fatura e confirmar o recebimento. Origem: Handoff automático.", dueInDays: 1 },
  LOGISTICS: { title: (c) => `[Logística] Entregar: ${c}`, description: "Venda ganha. Preparar e agendar a entrega. Origem: Handoff automático.", dueInDays: 3 },
};

export const isHandoffTransition = (from: Stage | null, to: Stage): boolean => to === "WON" && from !== "WON";
export const isTerminal = (stage: Stage): boolean => stage === "WON";
