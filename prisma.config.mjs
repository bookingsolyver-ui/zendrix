import { defineConfig } from "prisma/config";

// Prisma 7 does not auto-load env files; the project keeps its secrets in .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local missing — fall back to variables already present in the environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // CLI commands (db push, migrate) need the session/direct connection, not the transaction pooler.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
