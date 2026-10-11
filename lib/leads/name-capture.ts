// Captura do nome no início da conversa. Puro (sem servidor): testável. O fluxo (lib/agent/name-step.ts) só pergunta
// UMA vez, só em conversas novas de contactos sem nome, e só aceita como nome algo que pareça mesmo um nome.

export const NAME_ASK_TEXT = "Olá! Seja bem-vindo. Para começarmos, por favor indique o seu nome completo:";
// Sem pedido pendente: «Como posso ajudar?». Com um pedido pendente, só a saudação (o agente responde logo a seguir ao que
// ele já tinha pedido, sem lhe perguntar outra vez).
export const nameAckText = (first: string, hasPendingRequest = false) =>
  hasPendingRequest ? `Prazer, ${first}!` : `Prazer, ${first}! Como posso ajudar?`;

// "O meu nome é…", "chamo-me…", "sou o…", em pt/en/es.
const LEAD_IN = /^(?:(?:o\s+)?meu\s+nome\s+(?:é|e)|chamo[-\s]?me|eu\s+(?:sou|me\s+chamo)|me\s+chamo|sou\s+(?:o|a)|sou|my\s+name\s+is|i\s*['’]?m|i\s+am|me\s+llamo|mi\s+nombre\s+es|soy)\s+/i;

// Respostas que não são um nome, ou que são o início de um pedido: aí não se grava nada e o agente responde normalmente.
const NOT_NAMES = new Set([
  "sim", "não", "nao", "ok", "olá", "ola", "oi", "hello", "hi", "hola", "obrigado", "obrigada", "thanks", "gracias",
  "bom dia", "boa tarde", "boa noite", "tudo bem", "preço", "preco", "info", "informação", "informacao", "ajuda", "help",
]);
const REQUEST_WORDS = /^(quero|queria|gostaria|preciso|precisava|como|quanto|qual|quais|onde|quando|porque|porquê|tem|têm|tenho|pode|podem|podia|bom|boa|olá|ola|oi|vou|estou|estava|é|e|há|ha|what|how|can|do|does|i|we|quiero|necesito|cuánto|cuanto)\b/i;
const PARTICLES = new Set(["da", "de", "do", "dos", "das", "e", "van", "von", "del", "la"]);
const NAME_SHAPE = /^[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){0,4}$/u;

export function extractName(raw: string | null | undefined): string | null {
  let text = (raw ?? "").trim().replace(/[.!,;:]+$/g, "").replace(/\s+/g, " ");
  if (!text || text.length > 80) return null;
  text = text.replace(LEAD_IN, "").trim();
  if (text.length < 2 || text.length > 60) return null;
  if (/[\d@/\\?¿¡!_*#<>{}[\]|~]/.test(text) || /https?:|www\./i.test(text)) return null;
  if (NOT_NAMES.has(text.toLowerCase()) || REQUEST_WORDS.test(text)) return null;
  if (!NAME_SHAPE.test(text)) return null;
  return text
    .split(" ")
    .map((word, index) => (index > 0 && PARTICLES.has(word.toLowerCase()) ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export type NameStep = "ask" | "retry" | "capture" | "skip";

export const NAME_RETRY_TEXT = "Desculpe, não consegui perceber o nome. Pode indicar o seu nome completo, por favor?";
const MAX_ASKS = 2; // o pedido e UMA repetição; depois disso o agente segue normalmente (nunca prende o cliente)

export function decideNameStep(facts: {
  contactHasName: boolean;
  asks: number; // quantas vezes já pedimos o nome nesta conversa (pedido + repetição)
  lastOutgoingIsAsk: boolean; // a última mensagem nossa foi um pedido do nome
  inboundText: string | null;
}): NameStep {
  if (facts.contactHasName) return "skip";
  if (facts.asks === 0) return "ask"; // a primeira (e única) resposta a um contacto sem nome: pedir o nome
  if (!facts.lastOutgoingIsAsk) return "skip";
  if (extractName(facts.inboundText)) return "capture";
  return facts.asks < MAX_ASKS ? "retry" : "skip";
}

// Só uma saudação («Olá», «Bom dia, tudo bem?»): não é um pedido a que haja que responder depois de saber o nome.
const GREETING = /^(?:ol[aá]|oi|ei|hey|hello|hi|hola|boas|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|buenos\s+d[ií]as|buenas)(?:[\s,!.?]+(?:ol[aá]|oi|tudo\s+bem|bom\s+dia|boa\s+tarde|boa\s+noite))*[\s,!.?]*$/i;
export const isGreetingOnly = (text: string) => GREETING.test(text.trim());

export interface HistoryEntry {
  direction: "IN" | "OUT";
  body: string;
}

// O pedido que o cliente fez ANTES de lhe pedirmos o nome (a última mensagem dele que não seja só uma saudação).
// null = não havia pedido nenhum (só «Olá»): basta saudá-lo. `history` por ordem cronológica.
export function findOriginalRequest(history: HistoryEntry[]): string | null {
  const firstAsk = history.findIndex((entry) => entry.direction === "OUT" && entry.body === NAME_ASK_TEXT);
  const before = (firstAsk === -1 ? history : history.slice(0, firstAsk)).filter((entry) => entry.direction === "IN");
  for (let i = before.length - 1; i >= 0; i--) {
    const text = before[i].body.trim();
    if (text && !isGreetingOnly(text)) return text;
  }
  return null;
}

// O histórico que o modelo lê DEPOIS de guardar o nome: sem o pedido do nome, a repetição, a resposta com o nome
// (a última mensagem do cliente) nem o «Prazer, …». Assim a última coisa que o cliente disse é o pedido original.
export function dropNameExchange<T extends HistoryEntry>(history: T[], ackText: string): T[] {
  const lastIn = history.map((entry) => entry.direction).lastIndexOf("IN");
  return history.filter(
    (entry, index) =>
      index !== lastIn && !(entry.direction === "OUT" && (entry.body === NAME_ASK_TEXT || entry.body === NAME_RETRY_TEXT || entry.body === ackText)),
  );
}
