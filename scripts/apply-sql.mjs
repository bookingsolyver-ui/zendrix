// Aplica um ficheiro .sql (por exemplo em supabase/migrations/) numa única transação:
// ou entra tudo, ou nada.   node scripts/apply-sql.mjs supabase/migrations/<ficheiro>.sql
// Usa a ligação direta (DIRECT_URL), com o papel postgres.
import { readFileSync } from "node:fs";
import pg from "pg";

process.loadEnvFile(".env.local");
const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/apply-sql.mjs <ficheiro.sql>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
try {
  await client.query("begin");
  await client.query(readFileSync(file, "utf8"));
  await client.query("commit");
  console.log(`Migração aplicada: ${file}`);
} catch (err) {
  await client.query("rollback");
  console.error("Falhou e foi revertida (nada mudou):", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
