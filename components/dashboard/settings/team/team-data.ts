export type TeamRole = "Administrador" | "Atendente" | "Visualizador";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastAccess: string;
};

export const ROLES: TeamRole[] = ["Administrador", "Atendente", "Visualizador"];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "member-1",
    name: "Filipe Oliveira",
    email: "bookings.olyver@gmail.com",
    role: "Administrador",
    lastAccess: "Agora",
  },
  {
    id: "member-2",
    name: "Ana Martins",
    email: "ana.martins@zentrix-demo.com",
    role: "Atendente",
    lastAccess: "Há 3 dias",
  },
];

export const SEATS_TOTAL = 5;
