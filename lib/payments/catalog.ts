// Catálogo de pagamentos: valores e moedas. Puro (sem servidor).
import { z } from "zod";

// As moedas que o Stripe aceita e que fazem sentido aqui. (O kwanza, AOA, não é aceite pelo Stripe.)
export const CURRENCIES = ["EUR", "USD", "GBP", "BRL"] as const;
export type Currency = (typeof CURRENCIES)[number];

const MIN_MINOR = 50; // 0,50: abaixo disto o Stripe recusa
const MAX_MINOR = 100_000_000; // 1.000.000,00

// "29,90", "29.90", "1.299,90", "1,299.90", 29.9 -> 2990. Devolve null se não for um valor válido.
export function parseAmountToMinor(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? clampMinor(Math.round(input * 100)) : null;
  const text = input.replace(/[\s€$£]|R\$|EUR|USD|GBP|BRL/gi, "");
  if (!/^\d[\d.,]*$/.test(text)) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Os dois: o que vem por último é o decimal; o outro é separador de milhares.
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = text.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const separator = lastComma !== -1 ? "," : ".";
    const parts = text.split(separator);
    // Uma só ocorrência com 1-2 dígitos depois = decimal. Três dígitos (1.299) ou várias ocorrências = milhares.
    normalized = parts.length === 2 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : parts.join("");
  } else {
    normalized = text;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? clampMinor(Math.round(value * 100)) : null;
}

const clampMinor = (minor: number): number | null => (minor >= MIN_MINOR && minor <= MAX_MINOR ? minor : null);

export function formatMoney(amountMinor: number, currency: string, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 100);
}

// Um item do catálogo, tal como vem do formulário. O valor aceita texto ("29,90") e converte-se para cêntimos.
export const paymentItemInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  amount: z.union([z.string(), z.number()]).transform((value, ctx) => {
    const minor = parseAmountToMinor(value);
    if (minor === null) ctx.addIssue({ code: "custom", message: "invalid_amount" });
    return minor ?? 0;
  }),
  currency: z.enum(CURRENCIES),
  active: z.boolean().optional(),
});
export type PaymentItemInput = z.infer<typeof paymentItemInputSchema>;
