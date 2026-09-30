import type { LucideIcon } from "lucide-react";

export type Automation = {
  id: string;
  icon: LucideIcon;
  title: string;
  trigger: string;
  conversion: string;
  sends: string;
  active: boolean;
};

export const INITIAL_AUTOMATIONS: Automation[] = [];
