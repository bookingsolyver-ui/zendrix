// Puro (sem servidor): como um modelo do Kwanza Flow se traduz para a Graph API da Meta (criar, ler e enviar).
import { templateVariables } from "./schema.ts";

export const META_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"] as const;
export type MetaStatus = (typeof META_STATUSES)[number];

export const META_STATUS_LABEL: Record<MetaStatus, string> = {
  DRAFT: "Rascunho",
  PENDING: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  PAUSED: "Pausado",
  DISABLED: "Desativado",
};

export const asMetaStatus = (value: unknown): MetaStatus =>
  META_STATUSES.includes(value as MetaStatus) ? (value as MetaStatus) : "DRAFT";

// Corpo do POST /{waba}/message_templates. A Meta exige exemplos para cada variável.
export function buildCreatePayload(input: { name: string; category: string; language: string; body: string }, examples: string[]) {
  const variables = templateVariables(input.body);
  const body: Record<string, unknown> = { type: "BODY", text: input.body };
  if (variables.length > 0) body.example = { body_text: [variables.map((_, index) => examples[index]?.trim() || "exemplo")] };
  return { name: input.name, category: input.category, language: input.language, components: [body] };
}

interface MetaComponent {
  type?: string;
  format?: string;
  text?: string;
  buttons?: { type?: string; url?: string }[];
}

// O texto do corpo e se o Kwanza Flow sabe enviar o modelo (só corpo de texto; cabeçalho de texto sem variáveis; botões fixos).
export function readMetaComponents(components: unknown): { body: string; sendable: boolean } {
  const list = (Array.isArray(components) ? components : []) as MetaComponent[];
  const body = list.find((c) => c.type === "BODY")?.text ?? "";
  let sendable = body.length > 0;
  for (const c of list) {
    if (c.type === "HEADER" && (c.format !== "TEXT" || /\{\{/.test(c.text ?? ""))) sendable = false;
    if (c.type === "BUTTONS" && c.buttons?.some((b) => b.type === "URL" && /\{\{/.test(b.url ?? ""))) sendable = false;
  }
  return { body, sendable };
}

// Os parâmetros da Meta não aceitam mudanças de linha, tabulações nem 4+ espaços seguidos.
export const cleanParam = (value: string) => value.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim();

export function renderTemplate(body: string, params: string[]): string {
  return body.replace(/\{\{(\d{1,2})\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}

// "ok" só se houver um valor não vazio para cada variável {{1}}..{{n}}.
export function checkParams(body: string, params: string[]): string[] | null {
  const count = templateVariables(body).length;
  if (params.length !== count) return null;
  const cleaned = params.map(cleanParam);
  return cleaned.every((p) => p.length > 0 && p.length <= 200) ? cleaned : null;
}

export function buildTemplateMessage(to: string, name: string, language: string, params: string[]) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name,
      language: { code: language },
      ...(params.length > 0 ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] } : {}),
    },
  };
}
