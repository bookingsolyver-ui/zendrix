// Puro (sem servidor, sem alias @/): usado por lib/stripe/client.ts e testável com `node --test`.

export type FormValue = string | number | boolean | null | undefined | FormValue[] | { [key: string]: FormValue };

// A API do Stripe recebe application/x-www-form-urlencoded com chaves aninhadas:
// { line_items: [{ price: "p", quantity: 1 }] } -> line_items[0][price]=p&line_items[0][quantity]=1
// Valores null/undefined são omitidos.
export function encodeForm(params: { [key: string]: FormValue }): string {
  const pairs: string[] = [];
  const walk = (value: FormValue, key: string) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${key}[${index}]`));
    } else if (typeof value === "object") {
      for (const [child, v] of Object.entries(value)) walk(v, `${key}[${child}]`);
    } else {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  };
  for (const [key, value] of Object.entries(params)) walk(value, key);
  return pairs.join("&");
}

// O Checkout exige que `trial_end` esteja pelo menos 48 horas no futuro. Com uma pequena folga.
export const MIN_TRIAL_SECONDS = 48 * 60 * 60 + 5 * 60;

// O que resta do teste grátis da organização, como `trial_end` do Stripe (segundos). Devolve undefined
// (sem teste: cobra logo) quando a organização já gastou o teste, já teve subscrição, ou resta menos do
// mínimo que o Stripe aceita. Nunca se dão 14 dias novos a quem já os usou.
export function trialEndFor(
  subStatus: string,
  trialEndsAt: Date | null,
  nowMs = Date.now(),
): number | undefined {
  if (subStatus !== "trialing" || !trialEndsAt) return undefined;
  const end = Math.floor(trialEndsAt.getTime() / 1000);
  return end - Math.floor(nowMs / 1000) >= MIN_TRIAL_SECONDS ? end : undefined;
}
