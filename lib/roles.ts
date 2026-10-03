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
