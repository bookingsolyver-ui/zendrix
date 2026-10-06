// Similaridade de contactos para a desduplicação. Puro (sem servidor): testável. Determinístico (sem LLM): auditável,
// grátis e com o mesmo resultado sempre; quem decide o merge é uma pessoa.

export const normalizeName = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched: boolean[] = new Array(a.length).fill(false);
  const bMatched: boolean[] = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j <= Math.min(b.length - 1, i + range); j++) {
      if (!bMatched[j] && a[i] === b[j]) {
        aMatched[i] = bMatched[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < Math.min(4, a.length, b.length) && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

// Compara por palavras: «Joao Silva» ~ «João H. Silva» (a inicial do meio não conta contra) e «J. Silva» ~ «João Silva».
export function nameSimilarity(a: string, b: string): number {
  const ta = normalizeName(a).split(" ").filter(Boolean);
  const tb = normalizeName(b).split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const pool = [...long];
  let total = 0;
  for (const token of short) {
    let best = 0;
    let bestIndex = -1;
    pool.forEach((other, index) => {
      const score = token === other ? 1 : token.length === 1 || other.length === 1 ? (token[0] === other[0] ? 0.8 : 0) : jaroWinkler(token, other) >= 0.88 ? jaroWinkler(token, other) : 0;
      if (score > best) [best, bestIndex] = [score, index];
    });
    if (bestIndex >= 0) pool.splice(bestIndex, 1);
    total += best;
  }
  return total / short.length;
}

// Os últimos 9 dígitos identificam o número sem indicativo: «922 123 456» e «+244 922 123 456» são o mesmo.
export function phoneKey(waId: string): string | null {
  const digits = waId.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
}

export interface ContactLike {
  id: string;
  name: string | null;
  waId: string;
  platform: string;
  email: string | null;
}

export const LIST_THRESHOLD = 0.75;

// Só há candidato se partilham telefone OU e-mail: o nome sozinho gera homónimos a mais.
export function scorePair(a: ContactLike, b: ContactLike): { score: number; reasons: string[] } | null {
  const reasons: string[] = [];
  const pa = a.platform === "WHATSAPP" ? phoneKey(a.waId) : null;
  const pb = b.platform === "WHATSAPP" ? phoneKey(b.waId) : null;
  const samePhone = pa !== null && pa === pb;
  const sameEmail = !!a.email && !!b.email && a.email.toLowerCase() === b.email.toLowerCase();
  if (!samePhone && !sameEmail) return null;
  const names = a.name && b.name ? nameSimilarity(a.name, b.name) : 0.5; // sem um dos nomes: neutro
  if (samePhone) reasons.push("mesmo telefone");
  if (sameEmail) reasons.push("mesmo e-mail");
  if (names >= 0.85) reasons.push("nomes muito parecidos");
  const score = Math.min(1, (samePhone && sameEmail ? 0.75 : 0.6) + 0.4 * names);
  return score >= LIST_THRESHOLD ? { score: Math.round(score * 100) / 100, reasons } : null;
}
