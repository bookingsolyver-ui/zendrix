export type TeamRole = "Administrador" | "Atendente" | "Visualizador";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastAccess: string;
};

export const ROLES: TeamRole[] = ["Administrador", "Atendente", "Visualizador"];

export const SEATS_TOTAL = 5;
