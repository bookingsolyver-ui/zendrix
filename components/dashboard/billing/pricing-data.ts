export type Currency = "AOA" | "BRL" | "EUR" | "USD";
export type Cycle = "monthly" | "semiannual" | "annual";
export type PlanId = "basic" | "pro" | "enterprise";

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: "AOA", label: "Kwanza", symbol: "Kz" },
  { code: "BRL", label: "Real", symbol: "R$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "USD", label: "Dólar", symbol: "$" },
];

export const CYCLES: { code: Cycle; label: string; months: number; discountPct: number }[] = [
  { code: "monthly", label: "Mensal", months: 1, discountPct: 0 },
  { code: "semiannual", label: "Semestral", months: 6, discountPct: 10 },
  { code: "annual", label: "Anual", months: 12, discountPct: 20 },
];

export const MONTHLY_PRICES: Record<PlanId, Record<Currency, number>> = {
  basic: { USD: 29, BRL: 149, AOA: 35000, EUR: 27 },
  pro: { USD: 49, BRL: 249, AOA: 75000, EUR: 45 },
  enterprise: { USD: 89, BRL: 449, AOA: 150000, EUR: 82 },
};

export const PLANS: {
  id: PlanId;
  name: string;
  description: string;
  highlight?: boolean;
  cta: string;
  features: string[];
}[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Para começar a organizar vendas e atendimento.",
    cta: "Mudar para Basic",
    features: [
      "1.000 envios de mensagens / mês",
      "1 número de WhatsApp",
      "1 membro de equipa",
      "CRM básico",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para equipas em crescimento que precisam de automação e IA.",
    highlight: true,
    cta: "Plano atual",
    features: [
      "10.000 envios de mensagens / mês",
      "3 números de WhatsApp",
      "Caixas de entrada multiagente",
      "Respostas de IA por texto e voz",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para operações de grande escala com necessidades avançadas.",
    cta: "Fazer upgrade",
    features: [
      "Envios de mensagens ilimitados",
      "Números de WhatsApp ilimitados",
      "Membros de equipa ilimitados",
      "CRM completo com automações",
    ],
  },
];

export const FEATURE_ROWS: { label: string; values: [string, string, string] }[] = [
  {
    label: "Envios de mensagens",
    values: ["1.000 / mês", "10.000 / mês", "Ilimitado"],
  },
  {
    label: "Números de WhatsApp",
    values: ["1 número", "3 números", "Ilimitado"],
  },
  {
    label: "Membros de equipa",
    values: ["1 membro", "5 membros", "Ilimitado"],
  },
  {
    label: "Caixas de entrada (multiagente)",
    values: ["—", "Sim", "Sim"],
  },
  {
    label: "Respostas de IA por voz/texto",
    values: ["Texto apenas", "Texto + voz", "Texto + voz avançado"],
  },
  {
    label: "Agendas",
    values: ["1 agenda", "5 agendas", "Ilimitado"],
  },
  {
    label: "CRM",
    values: ["Básico", "Completo", "Completo + automações"],
  },
];

function withThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatPrice(amount: number, currency: Currency): string {
  const value = withThousands(amount);

  switch (currency) {
    case "AOA":
      return `${value} Kz`;
    case "BRL":
      return `R$ ${value}`;
    case "EUR":
      return `€ ${value}`;
    case "USD":
    default:
      return `$ ${value}`;
  }
}

export function getCycleTotal(planId: PlanId, currency: Currency, cycle: Cycle): number {
  const monthly = MONTHLY_PRICES[planId][currency];
  const { months, discountPct } = CYCLES.find((c) => c.code === cycle)!;
  return monthly * months * (1 - discountPct / 100);
}

export function getCyclePerMonth(planId: PlanId, currency: Currency, cycle: Cycle): number {
  const { months } = CYCLES.find((c) => c.code === cycle)!;
  return getCycleTotal(planId, currency, cycle) / months;
}
