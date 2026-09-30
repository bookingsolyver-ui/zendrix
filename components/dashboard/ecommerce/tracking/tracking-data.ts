export type ShipmentStatus = "in_transit" | "delivered" | "processing";

export type Shipment = {
  id: string;
  order: string;
  customer: string;
  carrier: string;
  trackingCode: string;
  status: ShipmentStatus;
};

export const SHIPMENTS: Shipment[] = [];

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  in_transit: "Em Trânsito",
  delivered: "Entregue",
  processing: "Processando",
};

export const STATUS_STYLES: Record<ShipmentStatus, string> = {
  in_transit: "bg-blue-500/10 text-blue-400",
  delivered: "bg-emerald-500/10 text-emerald-400",
  processing: "bg-amber-500/10 text-amber-400",
};
