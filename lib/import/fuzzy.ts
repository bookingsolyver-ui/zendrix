// Mapeamento «difuso» de colunas de ficheiros de clientes (CSV, Excel, JSON de outras ferramentas) para os campos
// do Kwanza Flow. Puro (sem servidor): partilhado pelo servidor e testável.
//
// Três sinais, do mais forte para o mais fraco:
//  1. sinónimos exatos / palavras-chave no cabeçalho («Nome Cliente», «Telemóvel», «Contacto», «Mobile»...);
//  2. distância de Levenshtein (tolera gralhas: «Telemovl», «E-mial»);
//  3. o CONTEÚDO da coluna (parece um telefone? um e-mail?), que resolve cabeçalhos ambíguos como «Contacto».
// Cada campo escolhe a melhor coluna e cada coluna serve no máximo um campo.

export const IMPORT_FIELDS = ["client_name", "phone", "email", "notes", "stage"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

// client_name -> Contact.name · phone -> Contact.waId (normalizado) · email -> Contact.email
// notes -> ContactNote · stage -> Contact.leadStage (nunca WON: só um pagamento confirma um cliente).
const SYNONYMS: Record<ImportField, string[]> = {
  client_name: ["nome", "nome cliente", "nome do cliente", "cliente", "client name", "name", "full name", "nome completo", "contact name", "razao social", "empresa", "company", "titular", "nombre"],
  phone: ["telefone", "telemovel", "telemóvel", "tel", "tlm", "tlf", "contacto", "contato", "numero", "whatsapp", "phone", "mobile", "cell", "celular", "movil", "phone number", "numero de telefone"],
  email: ["email", "e mail", "mail", "correio", "correio eletronico", "email address", "endereco de email", "correo"],
  notes: ["notas", "nota", "observacoes", "observacao", "obs", "comentarios", "comentario", "notes", "note", "comments", "description", "descricao"],
  stage: ["estado", "fase", "etapa", "status", "stage", "pipeline stage", "situacao", "deal stage"],
};

export const normalizeHeader = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

const similarity = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

// 0..1: o quanto um cabeçalho parece ser deste campo.
export function headerScore(header: string, field: ImportField): number {
  const h = normalizeHeader(header);
  if (!h) return 0;
  let best = 0;
  for (const raw of SYNONYMS[field]) {
    const synonym = normalizeHeader(raw);
    if (h === synonym) return 1;
    const tokens = h.split(" ");
    if (tokens.includes(synonym)) best = Math.max(best, 0.9); // «cliente nome» contém «nome»
    else if (synonym.length >= 4 && h.includes(synonym)) best = Math.max(best, 0.8);
    const sim = similarity(h, synonym);
    if (sim >= 0.75) best = Math.max(best, sim * 0.85); // gralhas
  }
  return best;
}

const PHONE_LIKE = /^\+?[\d\s().-]{8,20}$/;
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 0..1: a fração de valores da amostra que têm a forma do campo.
export function contentScore(values: string[], field: ImportField): number {
  const sample = values.map((v) => v.trim()).filter(Boolean).slice(0, 50);
  if (!sample.length) return 0;
  const hits = sample.filter((v) => {
    if (field === "phone") return PHONE_LIKE.test(v) && (v.match(/\d/g)?.length ?? 0) >= 8;
    if (field === "email") return EMAIL_LIKE.test(v);
    if (field === "client_name") return /[A-Za-zÀ-ÿ]{2,}/.test(v) && !EMAIL_LIKE.test(v) && !PHONE_LIKE.test(v);
    return false;
  }).length;
  return hits / sample.length;
}

export interface ColumnMatch {
  column: string;
  confidence: number; // 0..1
}
export type ColumnMapping = Partial<Record<ImportField, ColumnMatch>>;

const MIN_CONFIDENCE = 0.5;

// `columns` são os cabeçalhos tal como vêm no ficheiro; `rows` servem só para olhar ao conteúdo.
export function mapColumns(columns: string[], rows: Record<string, unknown>[] = []): ColumnMapping {
  const sampleOf = (column: string) => rows.slice(0, 50).map((r) => String(r[column] ?? ""));
  const candidates: { field: ImportField; column: string; score: number }[] = [];
  for (const column of columns) {
    const values = sampleOf(column);
    for (const field of IMPORT_FIELDS) {
      const byHeader = headerScore(column, field);
      const byContent = contentScore(values, field);
      // Telefone e e-mail têm formas inconfundíveis: o conteúdo manda. Um cabeçalho «Contacto» cheio de e-mails não é um
      // telefone; um cabeçalho vago cheio de números é. Sem linhas (só cabeçalhos), vale o cabeçalho.
      const formField = field === "phone" || field === "email";
      const hasValues = values.some((v) => v.trim());
      const score = formField && hasValues ? Math.max(byContent >= 0.6 ? 0.55 + byContent * 0.4 : 0, byHeader * (0.3 + 0.7 * byContent)) : byHeader + (byHeader > 0 ? byContent * 0.1 : 0);
      if (score >= MIN_CONFIDENCE) candidates.push({ field, column, score: Math.min(1, score) });
    }
  }
  // Atribuição gananciosa pelas melhores pontuações: um campo por coluna e uma coluna por campo.
  candidates.sort((a, b) => b.score - a.score);
  const mapping: ColumnMapping = {};
  const usedColumns = new Set<string>();
  for (const { field, column, score } of candidates) {
    if (mapping[field] || usedColumns.has(column)) continue;
    mapping[field] = { column, confidence: Math.round(score * 100) / 100 };
    usedColumns.add(column);
  }
  return mapping;
}
