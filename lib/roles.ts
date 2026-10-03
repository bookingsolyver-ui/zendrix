// Puro (sem servidor): a hierarquia de papéis, partilhável por componentes e testes.
// Espelha o enum Role de prisma/schema.prisma.
export const ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { OWNER: 3, MANAGER: 2, STAFF: 1 };

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);

// `role` tem pelo menos o poder de `minimum`?
export const roleAtLeast = (role: Role, minimum: Role) => RANK[role] >= RANK[minimum];

// Quem pode atribuir o quê: nunca se dá mais poder do que o que se tem, e ninguém cria OWNERs por aqui.
export const grantableRoles = (actor: Role): Role[] =>
  actor === "OWNER" ? ["MANAGER", "STAFF"] : actor === "MANAGER" ? ["STAFF"] : [];

// Como cada papel aparece ao utilizador. O enum da base de dados (STAFF) mantém-se; "Agente" é o nome visível.
export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gestor",
  STAFF: "Agente",
};

// O que cada papel pode fazer, em palavras (mostrado ao convidar).
export const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER: "Tudo, incluindo faturação, canais e eliminar a conta.",
  MANAGER: "Gere canais, ficha do negócio e agentes. Não mexe na faturação.",
  STAFF: "Atende as conversas na Inbox. Não altera configurações.",
};

// Quem pode gerir (alterar o papel, remover) quem: um OWNER gere MANAGER e STAFF, um MANAGER só STAFF.
// Ninguém gere um OWNER, nem a si próprio (isso decide-se à parte, com o id).
export const canManageRole = (actor: Role, target: Role) => grantableRoles(actor).includes(target);

// Lugares na equipa (membros + convites pendentes).
export const TEAM_SEATS = 5;
