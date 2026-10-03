// Lista os pedidos de eliminação de dados por tratar (formulário público). Cada um tem de ser tratado depois de
// VERIFICAR que o e-mail é de quem pediu (responder para o e-mail e pedir confirmação), em 30 dias.
//
//   node scripts/list-deletion-requests.mjs          pedidos "received"
//   node scripts/list-deletion-requests.mjs --all    todos
import pg from "pg";

process.loadEnvFile(".env.local");
const all = process.argv.includes("--all");

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
try {
  const { rows } = await client.query(
    `select code, source, contact, status, detail, "createdAt" from "DataDeletionRequest" ${all ? "" : "where status = 'received'"} order by "createdAt" asc`,
  );
  if (rows.length === 0) console.log("Nenhum pedido por tratar.");
  for (const r of rows) {
    const days = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86_400_000);
    console.log(`${r.code} · ${r.source} · ${r.status} · há ${days} dia(s)${r.contact ? ` · ${r.contact}` : ""}${r.detail ? ` · ${r.detail}` : ""}`);
  }
} finally {
  await client.end();
}
