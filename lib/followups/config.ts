// Configuração e decisão dos seguimentos automáticos (reengajamento). Puro (sem servidor).
//
// REGRA DA META que manda em tudo isto: só se pode enviar texto livre até 24 h depois da ÚLTIMA mensagem do
// cliente. Depois é preciso um template aprovado (que o produto ainda não tem). Por isso a configuração
// recusa passos que ultrapassem a janela, e a decisão confirma-a de novo no momento de enviar.
import { z } from "zod";
import type { LeadStageName } from "../leads/lead.ts";

export const WINDOW_MS = 24 * 60 * 60 * 1000;
// Margem: não se envia nos últimos minutos da janela (a Meta conta no relógio dela, não no nosso).
export const WINDOW_SAFETY_MS = 30 * 60 * 1000;
export const MAX_STEPS = 3;
export const MIN_STEP_MINUTES = 30;
export const MAX_STEP_MINUTES = 23 * 60;
export const MAX_TOTAL_MINUTES = 23 * 60;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone.length > 0 && timezone.length <= 64;
  } catch {
    return false;
  }
}

export const followUpConfigSchema = z
  .object({
    enabled: z.boolean(),
    // Cada passo conta desde a ÚLTIMA mensagem nossa sem resposta (cada seguimento reinicia o relógio).
    steps: z.array(z.object({ afterMinutes: z.number().int().min(MIN_STEP_MINUTES).max(MAX_STEP_MINUTES) })).min(1).max(MAX_STEPS),
    // Sem enviar durante estas horas (hora local do `timezone`): ninguém quer um WhatsApp às 3 da manhã.
    quietHours: z.object({ start: hhmm, end: hhmm }),
    timezone: z.string().refine(isValidTimezone, "invalid_timezone"),
  })
  .refine((config) => config.steps.reduce((sum, step) => sum + step.afterMinutes, 0) <= MAX_TOTAL_MINUTES, {
    message: "total_exceeds_window",
    path: ["steps"],
  });

export type FollowUpConfig = z.infer<typeof followUpConfigSchema>;

export const DEFAULT_FOLLOWUP_CONFIG: FollowUpConfig = {
  enabled: false,
  steps: [{ afterMinutes: 120 }, { afterMinutes: 18 * 60 }],
  quietHours: { start: "21:00", end: "08:00" },
  timezone: "Europe/Lisbon",
};

// A configuração guardada, ou null se não existe ou está inválida (nesse caso o motor fica desligado).
export function parseFollowUpConfig(raw: unknown): FollowUpConfig | null {
  const parsed = followUpConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// Minutos desde a meia-noite, na hora local de `timezone`.
export function localMinutes(nowMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(nowMs));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

// Estamos nas horas de silêncio? O intervalo pode passar da meia-noite (21:00 -> 08:00). start == end = sem silêncio.
export function isQuietHour(nowMs: number, timezone: string, start: string, end: string): boolean {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === to) return false;
  const now = localMinutes(nowMs, timezone);
  return from < to ? now >= from && now < to : now >= from || now < to;
}

// ------------------------------------------------------------------------------------------- a decisão
export interface FollowUpFacts {
  now: number;
  config: FollowUpConfig;
  // A última mensagem do cliente e a última nossa (ms). A conversa só interessa se a ÚLTIMA foi nossa.
  lastInboundAt: number | null;
  lastOutAt: number | null;
  lastMessageDirection: "IN" | "OUT" | null;
  // Quantos seguimentos já foram enviados desde a última mensagem do cliente.
  sentSinceInbound: number;
  paused: boolean; // uma pessoa assumiu: a IA cala-se
  optedOut: boolean;
  stage: LeadStageName;
}

export type FollowUpDecision =
  | { action: "send"; step: number }
  | { action: "wait"; reason: "not_due" | "quiet_hours" }
  | { action: "stop"; reason: "disabled" | "paused" | "opted_out" | "closed" | "customer_replied" | "no_inbound" | "sequence_done" | "window_closed" };

export function decideFollowUp(facts: FollowUpFacts): FollowUpDecision {
  const { config, now } = facts;
  if (!config.enabled) return { action: "stop", reason: "disabled" };
  if (facts.paused) return { action: "stop", reason: "paused" };
  if (facts.optedOut) return { action: "stop", reason: "opted_out" };
  if (facts.stage === "WON" || facts.stage === "LOST") return { action: "stop", reason: "closed" };
  // Se o cliente falou por último, não é caso de seguimento: é a IA que lhe responde.
  if (facts.lastMessageDirection !== "OUT" || facts.lastOutAt === null) return { action: "stop", reason: "customer_replied" };
  if (facts.lastInboundAt === null) return { action: "stop", reason: "no_inbound" };

  const step = facts.sentSinceInbound + 1;
  if (step > config.steps.length) return { action: "stop", reason: "sequence_done" };

  // A janela de 24 h conta desde a mensagem do CLIENTE (não desde a nossa).
  if (now - facts.lastInboundAt > WINDOW_MS - WINDOW_SAFETY_MS) return { action: "stop", reason: "window_closed" };

  const due = facts.lastOutAt + config.steps[step - 1].afterMinutes * 60_000;
  if (now < due) return { action: "wait", reason: "not_due" };
  if (isQuietHour(now, config.timezone, config.quietHours.start, config.quietHours.end)) return { action: "wait", reason: "quiet_hours" };
  return { action: "send", step };
}

// O texto de recurso se o modelo falhar: curto, neutro, sem pressão e sem inventar nada. O último passo
// despede-se (deixa a porta aberta, não insiste).
export function fallbackFollowUpText(step: number, totalSteps: number): string {
  return step >= totalSteps
    ? "Olá! Fico por aqui para não o incomodar. Se mais tarde quiser retomar a conversa, é só escrever. 🙂"
    : "Olá! Só passo para saber se ficou alguma dúvida. Estou por aqui para ajudar. 🙂";
}
