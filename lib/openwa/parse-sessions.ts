// Parsing puro (sem rede) da listagem de sessões do OpenWA, separado do cliente para se poder testar sozinho.

const LIST_WRAPPERS = [
  "data",
  "sessions",
  "response",
  "items",
  "results",
  "rows",
  "result",
];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

// Extrai o array de sessões de um corpo JSON de forma defensiva: array direto, ou embrulhado (até 2 níveis).
export function extractSessionArray(
  json: unknown,
  depth = 0,
): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (!isRecord(json) || depth > 2) return null;
  for (const key of LIST_WRAPPERS) {
    const found = extractSessionArray(json[key], depth + 1);
    if (found) return found;
  }
  // último recurso: a única propriedade que seja um array
  const arrays = Object.values(json).filter(Array.isArray);
  return arrays.length === 1 ? (arrays[0] as unknown[]) : null;
}
