export type OrderStatus = "paid" | "pending" | "cancelled";

export type Order = {
  id: string;
  customer: string;
  amount: string;
  status: OrderStatus;
  date: string;
};

export const ORDERS: Order[] = [
  { id: "#1042", customer: "Ana Martins", amount: "Kz 45.000", status: "paid", date: "27 Set 2026" },
  { id: "#1041", customer: "João Costa", amount: "Kz 89.000", status: "pending", date: "27 Set 2026" },
  { id: "#1040", customer: "Marta Silva", amount: "Kz 12.500", status: "paid", date: "26 Set 2026" },
  { id: "#1039", customer: "Óscar Lopes", amount: "Kz 210.000", status: "paid", date: "26 Set 2026" },
  { id: "#1038", customer: "Carla Neto", amount: "Kz 34.000", status: "cancelled", date: "25 Set 2026" },
  { id: "#1037", customer: "Pedro Alves", amount: "Kz 67.500", status: "pending", date: "24 Set 2026" },
];

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
