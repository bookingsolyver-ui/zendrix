import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Reuse one client across Next.js dev hot reloads to avoid exhausting pooler connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Runtime traffic goes through the transaction pooler (port 6543).
  // Em serverless (Vercel) cada instância abre o seu próprio pool: pequeno, para não esgotar as
  // ligações do pooler do Supabase. DATABASE_POOL_MAX ajusta; localmente usa o valor por omissão do pg.
  const max = Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : undefined);
  const adapter = new PrismaPg({ connectionString, ...(max ? { max } : {}) });
  return new PrismaClient({ adapter });
}

let client: PrismaClient | undefined;

function getClient() {
  client ??= globalForPrisma.prisma ?? createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

// O cliente só é criado na PRIMEIRA consulta, e não ao importar o módulo. Assim `next build` (que importa
// todas as rotas para recolher a configuração) não precisa da base de dados nem das variáveis de ambiente;
// se DATABASE_URL faltar, o erro aparece na primeira consulta, com a mesma mensagem de antes.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
