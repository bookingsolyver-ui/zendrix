// Puro (sem servidor): parte uma resposta longa em mensagens que cabem no limite de cada plataforma.
// O Instagram limita o texto a 1000 BYTES (UTF-8): uma frase com acentos e emojis ocupa mais do que parece.

export type PlatformName = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";

export interface TextLimit {
  maxChars?: number;
  maxBytes?: number;
}

export const TEXT_LIMITS: Record<PlatformName, TextLimit> = {
  WHATSAPP: { maxChars: 4096 },
  MESSENGER: { maxChars: 2000 },
  INSTAGRAM: { maxBytes: 1000 },
};

const fits = (text: string, { maxChars, maxBytes }: TextLimit) =>
  (maxChars === undefined || text.length <= maxChars) &&
  (maxBytes === undefined || Buffer.byteLength(text, "utf8") <= maxBytes);

// Quebra preferida: parágrafo > linha > fim de frase > espaço > corte seco.
const SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", " "];

export function splitText(text: string, limit: TextLimit): string[] {
  let rest = text.trim();
  const parts: string[] = [];

  while (rest && !fits(rest, limit)) {
    // A maior janela que cabe no limite.
    let end = Math.min(rest.length, limit.maxChars ?? rest.length);
    while (end > 1 && !fits(rest.slice(0, end), limit)) end--;

    // Procura um sítio natural para cortar na segunda metade da janela (não deixa pedaços minúsculos).
    let cut = -1;
    for (const separator of SEPARATORS) {
      const at = rest.lastIndexOf(separator, end - separator.length);
      if (at >= end / 2) {
        cut = at + (separator.trim() ? 1 : 0); // a pontuação fica no pedaço; o espaço/linha vai embora
        break;
      }
    }
    if (cut <= 0) cut = end;
    // Nunca partir um par substituto (emoji) ao meio.
    const last = rest.charCodeAt(cut - 1);
    if (last >= 0xd800 && last <= 0xdbff) cut--;

    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}
