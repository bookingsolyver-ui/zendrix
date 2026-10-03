// Gatilhos, ações e validação das automações. Puro (sem servidor): partilhado pela API, pelo motor, pela página e
// pelos testes. Tudo o que viaja para Client Components é texto e números (nunca funções nem ícones).
import { z } from "zod";
import { renderMessage } from "../campaigns/schema.ts";

export const TRIGGERS = ["NEW_CONTACT", "MESSAGE_RECEIVED", "LEAD_QUALIFIED", "PAYMENT_PAID"] as const;
export type TriggerValue = (typeof TRIGGERS)[number];

export const TRIGGER_LABEL: Record<TriggerValue, string> = {
  NEW_CONTACT: "Novo contacto",
  MESSAGE_RECEIVED: "Mensagem recebida",
  LEAD_QUALIFIED: "Lead qualificado",
  PAYMENT_PAID: "Pagamento confirmado",
};

export const TRIGGER_HINT: Record<TriggerValue, string> = {
  NEW_CONTACT: "Quando alguém contacta o negócio pela primeira vez (ou é adicionado).",
  MESSAGE_RECEIVED: "Quando um cliente escreve. Pode exigir uma palavra-chave.",
  LEAD_QUALIFIED: "Quando um contacto passa a Qualificado (pela IA ou por outra automação).",
  PAYMENT_PAID: "Quando um link de pagamento é pago.",
};

export const ACTION_TYPES = ["SEND_MESSAGE", "SET_STAGE", "CREATE_TASK"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_LABEL: Record<ActionType, string> = {
  SEND_MESSAGE: "Enviar mensagem",
  SET_STAGE: "Mudar a fase do contacto",
  CREATE_TASK: "Criar tarefa no CRM",
};

// Fases que uma automação pode atribuir. WON nunca: só o pagamento confirmado o atribui.
export const SETTABLE_STAGES = ["ENGAGED", "QUALIFIED", "LOST"] as const;
export const STAGE_LABEL: Record<(typeof SETTABLE_STAGES)[number], string> = { ENGAGED: "Em conversa", QUALIFIED: "Qualificado", LOST: "Perdido" };

export const MAX_ACTIONS = 3;
export const MAX_DELAY_MINUTES = 1380; // 23 h: depois disso a janela de 24 h da Meta já não permite texto livre
export const MAX_AUTOMATIONS = 20;
export const COOLDOWN_HOURS = 24; // a mesma automação só corre uma vez por contacto neste intervalo

const delay = z.number().int().min(0).max(MAX_DELAY_MINUTES).default(0);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SEND_MESSAGE"), text: z.string().trim().min(1).max(1000), delayMinutes: delay }),
  z.object({ type: z.literal("SET_STAGE"), stage: z.enum(SETTABLE_STAGES), delayMinutes: delay }),
  z.object({ type: z.literal("CREATE_TASK"), title: z.string().trim().min(1).max(140), delayMinutes: delay }),
]);
export type ActionConfig = z.infer<typeof actionSchema>;

export const triggerConfigSchema = z.object({
  // Só para MESSAGE_RECEIVED: a mensagem tem de conter esta palavra/expressão (sem distinguir maiúsculas nem acentos).
  keyword: z.string().trim().max(60).default(""),
});
export type TriggerConfig = z.infer<typeof triggerConfigSchema>;

export const automationInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    trigger: z.enum(TRIGGERS),
    config: triggerConfigSchema.default({ keyword: "" }),
    actions: z.array(actionSchema).min(1).max(MAX_ACTIONS),
  })
  .superRefine((value, ctx) => {
    for (const [index, action] of value.actions.entries()) {
      const text = action.type === "SEND_MESSAGE" ? action.text : action.type === "CREATE_TASK" ? action.title : "";
      if (unknownVars(text).length > 0) ctx.addIssue({ code: "custom", path: ["actions", index], message: "unknown_placeholder" });
    }
    if (value.trigger !== "MESSAGE_RECEIVED" && value.config.keyword) ctx.addIssue({ code: "custom", path: ["config", "keyword"], message: "keyword_not_allowed" });
  });
export type AutomationInput = z.infer<typeof automationInputSchema>;

// Só {{nome}} é suportada (como nas campanhas).
const unknownVars = (text: string) => [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1]).filter((name) => name.toLowerCase() !== "nome");

export const parseActions = (value: unknown): ActionConfig[] => {
  const parsed = z.array(actionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
};
export const parseTriggerConfig = (value: unknown): TriggerConfig => {
  const parsed = triggerConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : { keyword: "" };
};

// Minúsculas e sem acentos: "Preço" e "preco" são a mesma palavra.
export const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const matchesKeyword = (body: string, keyword: string) => {
  const needle = fold(keyword).trim();
  return needle === "" || fold(body).includes(needle);
};

// Quando cada ação fica "devida": as esperas somam-se, contadas desde o evento.
export function scheduleSteps(actions: ActionConfig[], startedAt: Date): { index: number; action: ActionConfig; dueAt: Date }[] {
  let elapsed = 0;
  return actions.map((action, index) => {
    elapsed += action.delayMinutes;
    return { index, action, dueAt: new Date(startedAt.getTime() + elapsed * 60_000) };
  });
}

export const renderText = renderMessage;

// A mesma automação já correu para este contacto há pouco? (evita repetições, por exemplo uma palavra-chave dita 5 vezes)
export const inCooldown = (lastRunAt: Date | null, now: Date) => lastRunAt !== null && now.getTime() - lastRunAt.getTime() < COOLDOWN_HOURS * 3_600_000;

export function describeActions(actions: ActionConfig[]): string {
  return actions
    .map((action) => {
      const wait = action.delayMinutes > 0 ? `após ${action.delayMinutes >= 60 && action.delayMinutes % 60 === 0 ? `${action.delayMinutes / 60} h` : `${action.delayMinutes} min`}: ` : "";
      if (action.type === "SEND_MESSAGE") return `${wait}enviar mensagem`;
      if (action.type === "SET_STAGE") return `${wait}fase → ${STAGE_LABEL[action.stage]}`;
      return `${wait}criar tarefa`;
    })
    .join(" → ");
}

// Modelos prontos (só texto): "Usar este modelo" preenche o formulário.
export interface AutomationPreset {
  id: string;
  title: string;
  description: string;
  input: AutomationInput;
}
export const AUTOMATION_PRESETS: AutomationPreset[] = [
  {
    id: "welcome",
    title: "Boas-vindas a novo contacto",
    description: "Apresenta o negócio assim que alguém contacta pela primeira vez.",
    input: { name: "Boas-vindas", trigger: "NEW_CONTACT", config: { keyword: "" }, actions: [{ type: "SEND_MESSAGE", text: "Olá {{nome}}, obrigado por nos contactar! Em que podemos ajudar?", delayMinutes: 0 }] },
  },
  {
    id: "keyword",
    title: "Resposta a uma palavra-chave",
    description: "Responde quando o cliente escreve, por exemplo, «preço» ou «horário».",
    input: { name: "Resposta a «preço»", trigger: "MESSAGE_RECEIVED", config: { keyword: "preço" }, actions: [{ type: "SEND_MESSAGE", text: "Olá {{nome}}! Já lhe enviamos os nossos preços em instantes.", delayMinutes: 0 }, { type: "CREATE_TASK", title: "Enviar preços a {{nome}}", delayMinutes: 0 }] },
  },
  {
    id: "qualified",
    title: "Lead qualificado: avisar a equipa",
    description: "Cria uma tarefa no CRM para a equipa fechar o negócio.",
    input: { name: "Lead qualificado", trigger: "LEAD_QUALIFIED", config: { keyword: "" }, actions: [{ type: "CREATE_TASK", title: "Contactar {{nome}} (lead qualificado)", delayMinutes: 0 }] },
  },
  {
    id: "thanks",
    title: "Agradecer o pagamento",
    description: "Confirma a receção do pagamento e agradece ao cliente.",
    input: { name: "Agradecimento", trigger: "PAYMENT_PAID", config: { keyword: "" }, actions: [{ type: "SEND_MESSAGE", text: "Recebemos o seu pagamento, {{nome}}. Muito obrigado pela confiança!", delayMinutes: 0 }] },
  },
];
