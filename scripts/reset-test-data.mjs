// Limpa os dados de TESTE da base de dados (e, opcionalmente, os utilizadores do Supabase Auth) para recomeçar
// registos e conversas do zero. A estrutura (esquema, tabelas, triggers, RLS) NÃO é tocada.
//
//   node scripts/reset-test-data.mjs                          SIMULAÇÃO: só mostra o que seria apagado (padrão)
//   node scripts/reset-test-data.mjs --conversas --confirm=kwanza        apaga mensagens, conversas, contactos e fila
//   node scripts/reset-test-data.mjs --conversas --canais-qr --confirm=kwanza   + as ligações WhatsApp por QR
//   node scripts/reset-test-data.mjs --contas --keep=eu@exemplo.com --confirm=kwanza   + organizações e utilizadores
//
// NUNCA toca nos livros de auditoria imutáveis (AuditEvent, KwanzaAuditLog). --contas apaga os utilizadores do
// Supabase Auth que NÃO estejam em --keep (nem em SUPER_ADMIN_EMAILS): inclua sempre o seu e-mail.
// Corre na sua máquina com DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.
import pg from "pg";

process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const execute = value("confirm") === "kwanza";
const doConversas = flag("conversas") || flag("contas");
const doCanaisQr = flag("canais-qr") || flag("contas");
const doContas = flag("contas");
const keep = new Set(
  [...(value("keep") ?? "").split(","), ...(process.env.SUPER_ADMIN_EMAILS ?? "").split(",")]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const dbUrl = process.env.DIRECT_URL;
if (!dbUrl) {
  console.error("Falta DIRECT_URL em .env.local.");
  process.exit(1);
}
const host = new URL(dbUrl).hostname;
console.log(`Base de dados: ${host}  (${execute ? "EXECUÇÃO REAL" : "simulação, nada é apagado"})`);
if (doContas && keep.size === 0) {
  console.error("--contas exige --keep=o-seu@email (senão apagava também a sua conta).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
const count = async (sql, params = []) => Number((await client.query(sql, params)).rows[0].n);

// Utilizadores do Supabase Auth (API de administração).
async function listAuthUsers() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  const users = [];
  for (let page = 1; page < 100; page++) {
    const res = await fetch(`${base}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`Supabase Auth respondeu ${res.status}`);
    const batch = (await res.json()).users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}
const mask = (email) => email.replace(/^(.{2}).*(@.*)$/, "$1***$2");

try {
  const plan = [];
  if (doConversas) {
    plan.push(["Message", await count(`select count(*) n from "Message"`)]);
    plan.push(["Conversation", await count(`select count(*) n from "Conversation"`)]);
    plan.push(["OutboxMessage", await count(`select count(*) n from "OutboxMessage"`)]);
    plan.push(["OfferedSlot", await count(`select count(*) n from "OfferedSlot"`)]);
    plan.push(["Contact (e o que depende deles)", await count(`select count(*) n from "Contact"`)]);
  }
  if (doCanaisQr) {
    plan.push([
      "SocialIntegration WhatsApp por QR (qr:*)",
      await count(`select count(*) n from "SocialIntegration" where platform = 'WHATSAPP' and "providerAccountId" like 'qr:%'`),
    ]);
  }
  let authToDelete = [];
  if (doContas) {
    const all = await listAuthUsers();
    authToDelete = all.filter((u) => !keep.has((u.email ?? "").toLowerCase()));
    plan.push(["Supabase Auth: utilizadores a apagar", authToDelete.length]);
    plan.push(["Supabase Auth: utilizadores a manter", all.length - authToDelete.length]);
    plan.push(["Organizações sem nenhum utilizador mantido", await count(
      `select count(*) n from "Workspace" w where not exists (select 1 from "User" u where u."workspaceId" = w.id and lower(u.email) = any($1))`,
      [[...keep]],
    )]);
  }

  if (plan.length === 0) {
    console.log("Nada selecionado. Use --conversas, --canais-qr ou --contas (ver o cabeçalho do ficheiro).");
    process.exit(0);
  }
  for (const [what, n] of plan) console.log(`  ${String(n).padStart(6)}  ${what}`);
  if (authToDelete.length) console.log("  a apagar (Auth):", authToDelete.slice(0, 15).map((u) => mask(u.email ?? "?")).join(", "), authToDelete.length > 15 ? "…" : "");
  if (doContas) console.log("  a manter:", [...keep].map(mask).join(", "));

  if (!execute) {
    console.log("\nSimulação concluída. Para apagar a sério acrescente --confirm=kwanza (não há volta atrás).");
    process.exit(0);
  }

  await client.query("begin");
  if (doConversas) {
    for (const t of ["Message", "OutboxMessage", "OfferedSlot", "Conversation", "Contact"]) await client.query(`delete from "${t}"`);
  }
  if (doCanaisQr) await client.query(`delete from "SocialIntegration" where platform = 'WHATSAPP' and "providerAccountId" like 'qr:%'`);
  if (doContas) {
    await client.query(`delete from "User" where lower(email) <> all($1)`, [[...keep]]);
    await client.query(`delete from "Workspace" w where not exists (select 1 from "User" u where u."workspaceId" = w.id)`);
  }
  await client.query("commit");
  console.log("Base de dados limpa.");

  for (const user of authToDelete) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!res.ok) console.error(`  falhou apagar ${mask(user.email ?? "?")}: HTTP ${res.status}`);
  }
  if (authToDelete.length) console.log(`Supabase Auth: ${authToDelete.length} utilizador(es) apagado(s).`);
  if (doCanaisQr) console.log("Lembrete: apague também as sessões no servidor do OpenWA (ou use 'Desligar' no painel antes), senão ficam órfãs.");
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Falhou (nada foi apagado na base de dados):", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}
