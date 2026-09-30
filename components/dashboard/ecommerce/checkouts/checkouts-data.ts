export type AbandonedCheckout = {
  id: string;
  customer: string | null;
  amount: string;
  timeAgo: string;
};

export const ABANDONED_CHECKOUTS: AbandonedCheckout[] = [];

export const CHECKOUT_STATS = {
  abandonedToday: 0,
  recoveryRate: "—",
  amountAtRisk: "Kz 0",
};
