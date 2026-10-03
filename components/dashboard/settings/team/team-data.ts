import type { Role } from "@/lib/roles";
import { TEAM_SEATS } from "@/lib/roles";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastAccess: string;
  isSelf: boolean;
};

export type PendingInvite = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string; // ISO
};

export const SEATS_TOTAL = TEAM_SEATS;
