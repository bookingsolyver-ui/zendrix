import type { LucideIcon } from "lucide-react";
import { Disc3, Gift } from "lucide-react";

export type PopupStatus = "active" | "paused";

export type StorePopup = {
  id: string;
  name: string;
  status: PopupStatus;
  metric?: string;
  icon: LucideIcon;
  gradient: string;
};

export const STORE_POPUPS: StorePopup[] = [
  {
    id: "roleta-descontos",
    name: "Roleta de Descontos",
    status: "active",
    metric: "15% conversão",
    icon: Disc3,
    gradient: "from-violet-500/30 via-fuchsia-500/20 to-background",
  },
  {
    id: "raspadinha-surpresa",
    name: "Raspadinha Surpresa",
    status: "paused",
    icon: Gift,
    gradient: "from-amber-500/25 via-pink-500/15 to-background",
  },
];

export const STATUS_LABELS: Record<PopupStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
};

export const STATUS_STYLES: Record<PopupStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  paused: "bg-white/10 text-white/50",
};
