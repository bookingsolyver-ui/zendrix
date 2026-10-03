// Dá o papel OWNER ao utilizador mais antigo de cada organização que ainda não tem nenhum OWNER.
//
// Porquê: a coluna "User"."role" nasce com STAFF (privilégio mínimo) e as linhas que já existiam ficam STAFF.
// Antes do RBAC cada organização tinha um só utilizador, o que a criou: é esse o dono. Sem isto, ninguém
// consegue abrir o Checkout, o portal ou gerir chaves de API (exigem OWNER/MANAGER).
//
//   node scripts/backfill-roles.mjs --dry   só mostra o que mudaria
//   node scripts/backfill-roles.mjs         aplica
//
// Idempotente: organizações que já têm um OWNER não são tocadas. Usa DIRECT_URL (papel postgres).
import pg from "pg";

process.loadEnvFile(".env.local");
const dry = process.argv.includes("--dry");

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
try {
  const candidates = await client.query(`
    select distinct on (u."workspaceId") u.id, u.email, u."workspaceId"
    from "User" u
    where not exists (select 1 from "User" o where o."workspaceId" = u."workspaceId" and o.role = 'OWNER')
    order by u."workspaceId", u."createdAt" asc, u.id asc
  `);
  console.log(`${candidates.rowCount} organização(ões) sem OWNER.`);
  for (const row of candidates.rows) console.log(`  ${row.workspaceId} → ${row.email}`);
  if (!dry && candidates.rowCount) {
    const ids = candidates.rows.map((r) => r.id);
    const done = await client.query(`update "User" set role = 'OWNER' where id = any($1::text[])`, [ids]);
    console.log(`${done.rowCount} utilizador(es) promovido(s) a OWNER.`);
  }
} finally {
  await client.end();
}
