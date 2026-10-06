// Redação de segredos antes de gravar no livro de auditoria. Puro (sem servidor): testável.
// O livro é imutável: um segredo que entre lá fica para sempre. Por isso remove-se à entrada.
const SENSITIVE = /(password|passwd|secret|token|api[-_]?key|key[-_]?hash|authorization|cookie|card|cvv|iban)/i;
const MAX_DEPTH = 6;
const MAX_STRING = 2000;

export const REDACTED = "[redigido]";

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (depth > MAX_DEPTH) return "[profundo demais]";
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => redact(v, depth + 1));
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE.test(k) ? REDACTED : redact(v, depth + 1)]));
  return String(value);
}
