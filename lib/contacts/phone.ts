// Números de telefone dos contactos. Puro (sem servidor).

// "+351 912 345 678", "00351912345678", "(351) 912-345-678" -> "351912345678" (só dígitos, formato internacional
// sem "+", como o WhatsApp identifica as pessoas). Devolve null se não parecer um número internacional válido.
export function normalizePhone(input: string): string | null {
  let text = input.trim();
  if (text.startsWith("00")) text = text.slice(2);
  const digits = text.replace(/[\s().\-+]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  // E.164: até 15 dígitos; menos de 8 não é um número internacional completo.
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return digits;
}

// Telefone escrito por um visitante, que quase nunca traz o indicativo: sem "+" nem "00", aplica o indicativo por
// omissão do popup (só dígitos, ex.: "351"). Um número que já começa pelo indicativo e tem tamanho de número
// completo não leva o indicativo duas vezes.
export function normalizePhoneWithDial(input: string, dialCode: string): string | null {
  const text = input.trim();
  if (text.startsWith("+") || text.startsWith("00")) return normalizePhone(text);
  if (!/^\d{1,4}$/.test(dialCode)) return null; // sem "+" e sem indicativo por omissão: o país é desconhecido
  const digits = text.replace(/[\s().\-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith(dialCode) && digits.length >= dialCode.length + 8) return normalizePhone(digits);
  return normalizePhone(`${dialCode}${digits.replace(/^0+/, "")}`);
}
