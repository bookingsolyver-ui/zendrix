// Regras de um segmento dinâmico de contactos. Puro (sem servidor): partilhado pela API, pelas páginas e pelos testes.
import { z } from "zod";

export const LEAD_STAGES = ["NEW", "ENGAGED", "QUALIFIED", "PAYMENT_SENT", "WON", "LOST"] as const;
export type LeadStageValue = (typeof LEAD_STAGES)[number];

const TRI = z.enum(["any", "yes", "no"]);

export const segmentRulesSchema = z.object({
  stages: z.array(z.enum(LEAD_STAGES)).max(LEAD_STAGES.length).default([]),
  optedOut: TRI.default("any"),
  hasEmail: TRI.default("any"),
  createdWithinDays: z.number().int().min(1).max(3650).nullable().default(null),
});

export type SegmentRules = z.infer<typeof segmentRulesSchema>;

export const segmentInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  rules: segmentRulesSchema,
});

// Lê regras guardadas (JSON da base de dados); regras inválidas ou antigas viram "sem filtros" em vez de rebentar.
export function parseRules(value: unknown): SegmentRules {
  const parsed = segmentRulesSchema.safeParse(value);
  return parsed.success ? parsed.data : segmentRulesSchema.parse({});
}

type DateFilter = { gte: Date };
export interface ContactFilter {
  leadStage?: { in: LeadStageValue[] };
  optedOutAt?: null | { not: null };
  email?: null | { not: null };
  createdAt?: DateFilter;
}

// Traduz as regras para o filtro de contactos. `now` vem de fora para o resultado ser previsível (e testável).
export function rulesToFilter(rules: SegmentRules, now: Date): ContactFilter {
  const where: ContactFilter = {};
  if (rules.stages.length > 0) where.leadStage = { in: rules.stages };
  if (rules.optedOut === "yes") where.optedOutAt = { not: null };
  if (rules.optedOut === "no") where.optedOutAt = null;
  if (rules.hasEmail === "yes") where.email = { not: null };
  if (rules.hasEmail === "no") where.email = null;
  if (rules.createdWithinDays) where.createdAt = { gte: new Date(now.getTime() - rules.createdWithinDays * 86_400_000) };
  return where;
}

const STAGE_TEXT: Record<LeadStageValue, string> = {
  NEW: "Novo",
  ENGAGED: "Em conversa",
  QUALIFIED: "Qualificado",
  PAYMENT_SENT: "Pagamento enviado",
  WON: "Cliente",
  LOST: "Perdido",
};
export const stageText = (stage: LeadStageValue) => STAGE_TEXT[stage];

// As regras em palavras, para mostrar na lista ("Fase: Novo, Em conversa · Criado nos últimos 7 dias").
export function describeRules(rules: SegmentRules): string {
  const parts: string[] = [];
  if (rules.stages.length > 0) parts.push(`Fase: ${rules.stages.map(stageText).join(", ")}`);
  if (rules.createdWithinDays) parts.push(`Criado nos últimos ${rules.createdWithinDays} dias`);
  if (rules.hasEmail === "yes") parts.push("Com e-mail");
  if (rules.hasEmail === "no") parts.push("Sem e-mail");
  if (rules.optedOut === "yes") parts.push("Pediu para não receber automáticas");
  if (rules.optedOut === "no") parts.push("Aceita automáticas");
  return parts.length > 0 ? parts.join(" · ") : "Todos os contactos";
}
