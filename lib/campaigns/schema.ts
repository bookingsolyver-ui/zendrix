// Validação e regras das campanhas. Puro (sem servidor): partilhado pela API, pelo motor, pela página e pelos testes.
import { z } from "zod";

export const CAMPAIGN_STATUSES = ["SCHEDULED", "SENDING", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type CampaignStatusValue = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatusValue, string> = {
  SCHEDULED: "Agendada",
  SENDING: "A enviar",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
};

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_AUDIENCE = 5000; // destinatários por campanha
export const MAX_ACTIVE_CAMPAIGNS = 5; // agendadas ou a enviar, por organização
export const MAX_SCHEDULE_AHEAD_DAYS = 90;

// A única variável suportada é {{nome}}. Qualquer outra {{...}} é um erro (iria para o cliente tal e qual).
export function unknownPlaceholders(message: string): string[] {
  return [...message.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]).filter((name) => name.toLowerCase() !== "nome");
}

// Primeiro nome, ou "" se não houver um nome utilizável. Rejeita nomes que são só números/símbolos (perfis sem nome).
export function firstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return /\p{L}/u.test(first) ? first.slice(0, 40) : "";
}

// Aplica {{nome}}. Sem nome, a variável desaparece sem deixar espaços ou vírgulas soltos ("Olá , " vira "Olá,").
export function renderMessage(message: string, contactName: string | null | undefined): string {
  const name = firstName(contactName);
  return message
    .replace(/\{\{\s*nome\s*\}\}/gi, name)
    .replace(/[ \t]+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export const campaignInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
    // "builtin:<chave>" ou "custom:<id>"
    segment: z.string().regex(/^(builtin|custom):[A-Za-z0-9_-]{1,64}$/),
    schedule: z.discriminatedUnion("mode", [z.object({ mode: z.literal("now") }), z.object({ mode: z.literal("later"), at: z.string().datetime() })]),
  })
  .superRefine((value, ctx) => {
    if (unknownPlaceholders(value.message).length > 0) ctx.addIssue({ code: "custom", path: ["message"], message: "unknown_placeholder" });
  });

export type CampaignInput = z.infer<typeof campaignInputSchema>;

// Quando arranca: já, ou na data pedida (no futuro, dentro do limite). Devolve null se a data não serve.
export function resolveSchedule(schedule: CampaignInput["schedule"], now: Date): Date | null {
  if (schedule.mode === "now") return now;
  const at = new Date(schedule.at);
  if (Number.isNaN(at.getTime())) return null;
  if (at.getTime() < now.getTime() + 60_000) return null; // pelo menos 1 minuto à frente
  if (at.getTime() > now.getTime() + MAX_SCHEDULE_AHEAD_DAYS * 86_400_000) return null;
  return at;
}

export type SkipReason = "opted_out" | "no_conversation" | "window_closed" | "no_integration" | "cancelled" | "worker_interrupted" | "subscription_required" | "invalid";

export const SKIP_REASON_LABEL: Record<string, string> = {
  opted_out: "Pediram para não receber",
  no_conversation: "Sem conversa",
  window_closed: "Fora da janela de 24 h",
  no_integration: "Canal desligado",
  cancelled: "Campanha cancelada",
  worker_interrupted: "Envio interrompido",
  subscription_required: "Plano inativo",
};

export interface CampaignCounters {
  total: number;
  pending: number; // por processar
  queued: number; // na fila de saída, ainda por enviar
  sent: number; // enviadas à Meta (inclui entregues e lidas)
  delivered: number; // entregues (inclui lidas)
  read: number;
  failed: number;
  skipped: number;
}

// Estado final quando já não há destinatários por processar: Falhou só se NADA foi enfileirado e houve falhas.
export function finalStatus(counters: Pick<CampaignCounters, "queued" | "sent" | "delivered" | "read" | "failed" | "skipped">): "COMPLETED" | "FAILED" {
  const reached = counters.queued + counters.sent + counters.delivered + counters.read;
  return reached === 0 && counters.failed > 0 ? "FAILED" : "COMPLETED";
}

// Percentagem inteira (0-100); 0 se não há base.
export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
