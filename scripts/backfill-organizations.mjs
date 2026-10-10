// Preenche as organizações que já existiam antes das colunas novas (owner_email, agente).
//
//   node scripts/backfill-organizations.mjs                      → owner_email de todas
//   node scripts/backfill-organizations.mjs --seed-kwanza <id>  → + liga o agente da organização <id> com a
//                                                                  ficha da Kwanza Flow e marca a subscrição ativa
//
// A ficha da Kwanza Flow só deve ir para a organização que é a própria Kwanza Flow: qualquer outra tem de
// escrever a sua (senão o agente de um cliente falava dos produtos da Kwanza Flow). Idempotente.
import pg from "pg";
import { KWANZA_KNOWLEDGE } from "../lib/agent/negocio.ts";

process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const seedIdx = args.indexOf("--seed-kwanza");
const seedId = seedIdx !== -1 ? args[seedIdx + 1] : null;
if (seedIdx !== -1 && !seedId) {
  console.error("--seed-kwanza precisa do id da organização.");
  process.exit(1);
}

const db = new pg.Client({ connectionString: process.env.DIRECT_URL });
await db.connect();
try {
  await db.query("begin");

  // owner_email = o e-mail do primeiro utilizador da organização
  const owners = await db.query(`
    update "Workspace" w set owner_email = u.email
    from (select distinct on ("workspaceId") "workspaceId", email from "User" order by "workspaceId", "createdAt") u
    where u."workspaceId" = w.id and w.owner_email is null
    returning w.name, w.owner_email`);
  console.log(`owner_email preenchido em ${owners.rowCount} organização(ões):`, owners.rows.map((r) => `${r.name} → ${r.owner_email}`).join("; ") || "—");

  if (seedId) {
    const r = await db.query(
      `update "Workspace" set agent_enabled = true, sub_status = 'active', agent_knowledge = coalesce(agent_knowledge, $2)
       where id = $1 returning name, agent_enabled, sub_status, length(agent_knowledge) as ficha_caracteres`,
      [seedId, KWANZA_KNOWLEDGE]
    );
    if (r.rowCount !== 1) throw new Error(`organização ${seedId} não encontrada`);
    console.log("agente ligado:", JSON.stringify(r.rows[0]));
  }

  await db.query("commit");
} catch (err) {
  await db.query("rollback");
  console.error("Falhou e foi revertido:", err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
