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
