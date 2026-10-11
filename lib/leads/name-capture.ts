// Captura do nome no início da conversa. Puro (sem servidor): testável. O fluxo (lib/agent/name-step.ts) só pergunta
// UMA vez, só em conversas novas de contactos sem nome, e só aceita como nome algo que pareça mesmo um nome.

export const NAME_ASK_TEXT = "Olá! Seja bem-vindo. Para começarmos, por favor indique o seu nome completo:";
export const nameAckText = (first: string) => `Prazer, ${first}! Como posso ajudar?`;

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

export type NameStep = "ask" | "capture" | "skip";

export function decideNameStep(facts: {
  contactHasName: boolean;
  hasOutgoing: boolean; // já houve alguma mensagem nossa nesta conversa
  askedBefore: boolean; // já perguntámos o nome (nunca se pergunta duas vezes)
  lastOutgoingIsAsk: boolean;
  inboundText: string | null;
}): NameStep {
  if (facts.contactHasName) return "skip";
  if (!facts.askedBefore) return facts.hasOutgoing ? "skip" : "ask"; // só em conversas novas
  if (facts.lastOutgoingIsAsk && extractName(facts.inboundText)) return "capture";
  return "skip";
}
