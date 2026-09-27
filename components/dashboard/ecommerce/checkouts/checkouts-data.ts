export type AbandonedCheckout = {
  id: string;
  customer: string | null;
  amount: string;
  timeAgo: string;
};

export const ABANDONED_CHECKOUTS: AbandonedCheckout[] = [
  { id: "chk-1", customer: "Beatriz Fonseca", amount: "Kz 68.000", timeAgo: "há 12 minutos" },
  { id: "chk-2", customer: null, amount: "Kz 23.500", timeAgo: "há 45 minutos" },
  { id: "chk-3", customer: "Rui Ferreira", amount: "Kz 150.000", timeAgo: "há 2 horas" },
  { id: "chk-4", customer: null, amount: "Kz 41.000", timeAgo: "há 3 horas" },
  { id: "chk-5", customer: "Sara Pinto", amount: "Kz 92.000", timeAgo: "há 5 horas" },
];

export const CHECKOUT_STATS = {
  abandonedToday: 18,
  recoveryRate: "24%",
  amountAtRisk: "Kz 474.500",
};
