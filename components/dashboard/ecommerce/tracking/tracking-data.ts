export type ShipmentStatus = "in_transit" | "delivered" | "processing";

export type Shipment = {
  id: string;
  order: string;
  customer: string;
  carrier: string;
  trackingCode: string;
  status: ShipmentStatus;
};

export const SHIPMENTS: Shipment[] = [
  {
    id: "ship-1",
    order: "#1042",
    customer: "Ana Martins",
    carrier: "DHL Express",
    trackingCode: "DHL-88234721",
    status: "in_transit",
  },
  {
    id: "ship-2",
    order: "#1040",
    customer: "Marta Silva",
    carrier: "Correios de Angola",
    trackingCode: "CA-40213",
    status: "delivered",
  },
  {
    id: "ship-3",
    order: "#1039",
    customer: "Óscar Lopes",
    carrier: "UPS",
    trackingCode: "1Z999AA10123456",
    status: "in_transit",
  },
  {
    id: "ship-4",
    order: "#1038",
    customer: "Carla Neto",
    carrier: "Correios de Angola",
    trackingCode: "CA-40198",
    status: "delivered",
  },
  {
    id: "ship-5",
    order: "#1037",
    customer: "Pedro Alves",
    carrier: "DHL Express",
    trackingCode: "DHL-88234655",
    status: "processing",
  },
];

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
