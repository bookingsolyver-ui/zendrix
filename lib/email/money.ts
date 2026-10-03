// Um valor em unidade mínima (cêntimos) como texto na língua do leitor: 2990 + EUR -> «29,90 €». Puro.
const LOCALES = { pt: "pt-PT", en: "en-GB", es: "es-ES" } as const;
export function formatMoney(minor: number, currency: string, lang: "pt" | "en" | "es"): string {
  try {
    return new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency: currency.toUpperCase() }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`; // moeda desconhecida: nunca rebenta
  }
}
