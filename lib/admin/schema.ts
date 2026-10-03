// Validação e formatação do painel de administração da plataforma. Puro (sem servidor).
import { z } from "zod";

export const SUB_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type SubStatusValue = (typeof SUB_STATUSES)[number];
export const SUB_STATUS_LABEL: Record<string, string> = { trialing: "Em teste", active: "Ativa", past_due: "Em atraso", canceled: "Cancelada" };

export const ORG_FILTERS = ["all", "active", "trialing", "past_due", "canceled", "blocked"] as const;
export type OrgFilter = (typeof ORG_FILTERS)[number];
export const PAGE_SIZE = 25;

export interface OrgListQuery {
  page: number;
  q: string;
  status: OrgFilter;
}

// Lê os parâmetros do URL: tudo o que vem do utilizador é limitado e validado.
export function parseOrgListQuery(params: { page?: string; q?: string; status?: string }): OrgListQuery {
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(params.page)) || 1));
  const q = (params.q ?? "").trim().slice(0, 80);
  const status = (ORG_FILTERS as readonly string[]).includes(params.status ?? "") ? (params.status as OrgFilter) : "all";
  return { page, q, status };
}

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("unblock") }),
  z.object({
    action: z.literal("set_subscription"),
    subStatus: z.enum(SUB_STATUSES),
    plan: z.string().trim().max(40).nullable().default(null),
    // Só para "trialing": quantos dias de teste a partir de hoje.
    trialDays: z.number().int().min(1).max(90).optional(),
  }),
  z.object({ action: z.literal("extend_trial"), days: z.number().int().min(1).max(90) }),
]);
export type AdminAction = z.infer<typeof adminActionSchema>;

// "+" e pontos no lugar dos dígitos, menos os 3 últimos: o administrador vê que há um contacto, não o número todo.
export function maskPhone(waId: string): string {
  const digits = waId.replace(/\D/g, "");
  if (digits.length <= 3) return "•••";
  return `+${"•".repeat(Math.min(digits.length - 3, 8))}${digits.slice(-3)}`;
}

// Os ids do Stripe não são segredos, mas o painel mostra só o fim: chega para reconhecer e procurar no Stripe.
export function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length <= 10 ? id : `${id.slice(0, 4)}…${id.slice(-6)}`;
}

// Receita mensal estimada: subscrições ativas × preço do plano, convertido para um mês.
export function monthlyRevenueMinor(activeSubscriptions: number, unitAmount: number, interval: string, intervalCount = 1): number {
  const months = interval === "year" ? 12 * intervalCount : interval === "month" ? intervalCount : interval === "week" ? intervalCount / 4.345 : interval === "day" ? intervalCount / 30.4 : 0;
  if (months <= 0) return 0;
  return Math.round((activeSubscriptions * unitAmount) / months);
}

// O novo fim de teste ao prolongar: soma os dias ao que resta (ou a hoje, se já acabou).
export function extendedTrialEnd(current: Date | null, days: number, now = new Date()): Date {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + days * 86_400_000);
}
