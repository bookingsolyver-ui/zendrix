export type OrderStatus = "paid" | "pending" | "cancelled";

export type Order = {
  id: string;
  customer: string;
  amount: string;
  status: OrderStatus;
  date: string;
};

export const ORDERS: Order[] = [];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelado",
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  paid: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  cancelled: "bg-red-500/10 text-red-400",
};
