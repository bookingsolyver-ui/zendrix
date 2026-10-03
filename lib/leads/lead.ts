// Regras de qualificação de leads. Puro (sem servidor): testável e partilhado pela IA, pelo webhook e pela UI.
//
// A IA identifica a intenção e extrai dados, mas é o SERVIDOR que decide o que se grava: valida cada campo e
// só deixa o estado avançar com regras fixas. Um modelo enganado (ou uma mensagem maliciosa do cliente) nunca
// consegue, por exemplo, marcar como "ganho" um lead que não pagou.

export const LEAD_STAGES = ["NEW", "ENGAGED", "QUALIFIED", "PAYMENT_SENT", "WON", "LOST"] as const;
export type LeadStageName = (typeof LEAD_STAGES)[number];

export const LEAD_INTENTS = ["none", "interested", "ready_to_buy", "not_interested"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const LEAD_STAGE_LABEL: Record<LeadStageName, string> = {
  NEW: "Novo",
  ENGAGED: "Em conversa",
  QUALIFIED: "Qualificado",
  PAYMENT_SENT: "Pagamento enviado",
  WON: "Cliente",
  LOST: "Perdido",
};

const RANK: Record<Exclude<LeadStageName, "LOST">, number> = { NEW: 0, ENGAGED: 1, QUALIFIED: 2, PAYMENT_SENT: 3, WON: 4 };

// O estado seguinte, dada a intenção identificada pela IA.
//  * WON nunca muda (é o único estado que só o pagamento atribui).
//  * "not_interested" fecha o lead como LOST, mesmo com um link enviado.
//  * Só se avança; um lead perdido que volta a mostrar interesse reabre.
export function nextStage(current: LeadStageName, intent: LeadIntent): LeadStageName {
  if (current === "WON") return "WON";
  if (intent === "not_interested") return "LOST";
  if (intent === "none") return current;
  const target: Exclude<LeadStageName, "LOST"> = intent === "ready_to_buy" ? "QUALIFIED" : "ENGAGED";
  if (current === "LOST") return target;
  return RANK[current] >= RANK[target] ? current : target;
}

// Depois de enviar um link de pagamento. Nunca recua de WON.
export const stageAfterPaymentLink = (current: LeadStageName): LeadStageName => (current === "WON" ? "WON" : "PAYMENT_SENT");

// Pagamento confirmado pelo Stripe: o único caminho para WON.
export const stageAfterPayment = (): LeadStageName => "WON";

// ------------------------------------------------------------------------------------------- sanitização
// Caracteres de controlo e invisíveis (nulos, zero-width, separadores de linha...), definidos por código
// numérico para o ficheiro não conter nenhum caractere especial.
const CONTROL_RANGES: [number, number][] = [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2060], [0xfeff, 0xfeff]];
const CONTROL = new RegExp(`[${CONTROL_RANGES.map(([from, to]) => `\\u{${from.toString(16)}}-\\u{${to.toString(16)}}`).join("")}]`, "gu");
const URL_LIKE = /https?:\/\/\S+|www\.\S+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const STRICT_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const text = value.replace(CONTROL, " ").replace(URL_LIKE, "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && STRICT_EMAIL.test(email) ? email : null;
}

// O primeiro e-mail que aparece num texto livre (mensagem do cliente), ou null.
export function extractEmail(text: string): string | null {
  const match = EMAIL_RE.exec(text);
  return match ? normalizeEmail(match[0]) : null;
}

export interface LeadUpdate {
  name?: string;
  email?: string;
  painPoint?: string;
  intent?: LeadIntent;
  // O que o modelo enviou mas não se aceitou (o modelo é informado para corrigir).
  rejected: string[];
}

// Os argumentos da ferramenta atualizar_lead, validados campo a campo. Nada do modelo vai direto para a base
// de dados: tamanho limitado, sem ligações, sem caracteres de controlo.
export function sanitizeLeadUpdate(args: Record<string, unknown>): LeadUpdate {
  const out: LeadUpdate = { rejected: [] };

  if (args.nome !== undefined && args.nome !== "") {
    const name = clean(args.nome, 80);
    if (name && !name.includes("@")) out.name = name;
    else out.rejected.push("nome");
  }
  if (args.email !== undefined && args.email !== "") {
    const email = normalizeEmail(args.email);
    if (email) out.email = email;
    else out.rejected.push("email");
  }
  if (args.dor_principal !== undefined && args.dor_principal !== "") {
    const pain = clean(args.dor_principal, 300);
    if (pain) out.painPoint = pain;
    else out.rejected.push("dor_principal");
  }
  if (args.intencao !== undefined && args.intencao !== "") {
    if ((LEAD_INTENTS as readonly unknown[]).includes(args.intencao)) out.intent = args.intencao as LeadIntent;
    else out.rejected.push("intencao");
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ opt-out
// O cliente pede para não receber mais mensagens. Só conta se a mensagem INTEIRA for esse pedido: "preciso
// parar o serviço" ou "não quero o plano Pro" não são opt-out. Sem acentos, em minúsculas, sem pontuação.
const normalizeForOptOut = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u{300}-\u{36f}]/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const OPT_OUT = [
  /^(stop|stopp|parar|sair|cancelar|unsubscribe|remover|descadastrar|baja|chega)( (mensagens|envios|tudo|all|mensajes))?$/,
  /^(parar|stop|cancelar) (de )?(enviar|receber)( (mensagens|mais))?$/,
  /^nao (quero|desejo) (mais )?(receber )?(mais )?(mensagens|contactos?|contatos?)( automaticas?)?$/,
  /^nao (me )?(enviem|contactem|mandem|escrevam)( mais)?( mensagens)?$/,
  /^(please )?(do not|dont|don t) (message|contact|text) me( again| anymore)?$/,
  /^no quiero (recibir )?(mas )?(mensajes|contactos?)$/,
  /^dejar de recibir( mensajes)?$/,
];

export function isOptOut(text: string): boolean {
  const normalized = normalizeForOptOut(text);
  return normalized.length > 0 && normalized.length <= 40 && OPT_OUT.some((pattern) => pattern.test(normalized));
}

// A resposta fixa ao pedido (não passa pelo modelo: tem de ser sempre a mesma e nunca insistir).
export const OPT_OUT_REPLY = "Combinado: não lhe enviaremos mais mensagens automáticas. Se precisar de alguma coisa, é só escrever. 🙂";
