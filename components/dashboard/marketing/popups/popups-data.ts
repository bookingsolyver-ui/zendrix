import type { LucideIcon } from "lucide-react";

export type PopupStatus = "active" | "paused";

export type StorePopup = {
  id: string;
  name: string;
  status: PopupStatus;
  metric?: string;
  icon: LucideIcon;
  gradient: string;
};

export const STORE_POPUPS: StorePopup[] = [];

export const STATUS_LABELS: Record<PopupStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
};

export const STATUS_STYLES: Record<PopupStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  paused: "bg-white/10 text-white/50",
};
