// Das linhas cruas (CSV/Excel/JSON) para registos prontos a gravar. Puro (sem servidor): testável.
import { normalizePhoneWithDial } from "../contacts/phone.ts";
import { mapColumns, normalizeHeader, type ColumnMapping, type ImportField } from "./fuzzy.ts";

export const MAX_IMPORT_ROWS = 5000;
export type ImportStage = "NEW" | "ENGAGED" | "QUALIFIED" | "LOST";

export interface ImportRecord {
  name: string | null;
  waId: string;
  email: string | null;
  notes: string | null;
  stage: ImportStage;
}

export type RejectReason = "invalid_phone" | "duplicate_in_file";
export interface RejectedRow {
  row: number; // 1 = primeira linha de dados
  reason: RejectReason;
  value: string;
}

const clean = (value: unknown, max: number): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// O estado de outra ferramenta para o nosso. «Ganho/cliente» NÃO vira WON: só um pagamento confirmado atribui
// WON (regra do servidor, lib/leads/lead.ts). Ficam como QUALIFIED e a nota regista o estado original.
export function mapStage(value: string | null): ImportStage {
  const text = normalizeHeader(value ?? "");
  if (!text) return "NEW";
  if (/\b(lost|perdid|perdido|lose|descart|inativ|inactive|cancel)/.test(text)) return "LOST";
  if (/\b(won|ganh|cliente|customer|fechad|closed|qualif|proposta|proposal|negoci|quente|hot|pago|paid)/.test(text)) return "QUALIFIED";
  if (/\b(contact|conversa|engaged|follow|seguiment|reuniao|meeting|demo|em curso|open|aberto)/.test(text)) return "ENGAGED";
  return "NEW";
}

export function buildRecords(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  defaultDialCode: string,
): { records: ImportRecord[]; rejected: RejectedRow[] } {
  const records: ImportRecord[] = [];
  const rejected: RejectedRow[] = [];
  const seen = new Set<string>();
  const pick = (row: Record<string, unknown>, field: ImportField) => (mapping[field] ? row[mapping[field].column] : undefined);

  rows.forEach((row, index) => {
    const rawPhone = clean(pick(row, "phone"), 60);
    const waId = rawPhone ? normalizePhoneWithDial(rawPhone, defaultDialCode) : null;
    if (!waId) return void rejected.push({ row: index + 1, reason: "invalid_phone", value: (rawPhone ?? "").slice(0, 40) });
    if (seen.has(waId)) return void rejected.push({ row: index + 1, reason: "duplicate_in_file", value: waId });
    seen.add(waId);

    const rawStage = clean(pick(row, "stage"), 80);
    const stage = mapStage(rawStage);
    const email = clean(pick(row, "email"), 254)?.toLowerCase() ?? null;
    const notes = [clean(pick(row, "notes"), 1500), rawStage && stage !== "NEW" ? `Estado original: ${rawStage}` : null].filter(Boolean).join("\n") || null;
    records.push({ name: clean(pick(row, "client_name"), 120), waId, email: email && EMAIL.test(email) ? email : null, notes, stage });
  });
  return { records, rejected };
}

// ─── JSON de ferramentas concorrentes ───

const COLLECTION_KEYS = ["contacts", "contactos", "clients", "clientes", "leads", "people", "persons", "customers", "data", "items", "results", "records", "deals"];

// Aceita um array ou um objeto que o envolve numa chave habitual (HubSpot «results», Pipedrive «data», etc.).
export function extractRecords(json: unknown): Record<string, unknown>[] {
  const asRecords = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)) : null);
  const direct = asRecords(json);
  if (direct) return direct;
  if (typeof json === "object" && json !== null) {
    for (const key of COLLECTION_KEYS) {
      const found = asRecords((json as Record<string, unknown>)[key]);
      if (found?.length) return found;
    }
  }
  return [];
}

// {a:{b:1}, c:[{value:"x"}]} -> {"a.b":1, "c.0.value":"x"}: os cabeçalhos achatados passam pelo mesmo mapeamento difuso.
export function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}, depth = 0): Record<string, unknown> {
  if (depth > 4) return out;
  if (Array.isArray(value)) value.slice(0, 5).forEach((item, i) => flatten(item, prefix ? `${prefix}.${i}` : String(i), out, depth + 1));
  else if (value !== null && typeof value === "object") for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, out, depth + 1);
  else if (prefix) out[prefix] = value;
  return out;
}

// Nome próprio + apelido (muito comum: firstname/lastname) juntam-se numa coluna «nome» se não existir nome completo.
export function withFullName(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const keys = new Set(rows.flatMap((r) => Object.keys(r)));
  const find = (re: RegExp) => [...keys].find((k) => re.test(normalizeHeader(k)));
  const first = find(/\b(first name|firstname|primeiro nome|nome proprio|given name)\b/);
  const last = find(/\b(last name|lastname|apelido|sobrenome|surname|family name)\b/);
  if (!first || !last) return rows;
  const hasFull = [...keys].some((k) => /^(nome|name|full name|nome completo|nome cliente|cliente)$/.test(normalizeHeader(k.split(".").pop() ?? k)));
  if (hasFull) return rows;
  return rows.map((r) => ({ ...r, "nome completo": [r[first], r[last]].filter(Boolean).join(" ") }));
}

export function mapCompetitorJson(json: unknown): { rows: Record<string, unknown>[]; columns: string[]; mapping: ColumnMapping } {
  const rows = withFullName(extractRecords(json).slice(0, MAX_IMPORT_ROWS).map((r) => flatten(r)));
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return { rows, columns, mapping: mapColumns(columns, rows) };
}
