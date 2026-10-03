// Concede (ou retira) o acesso ao painel de administração da PLATAFORMA a um utilizador que já tem conta.
//   node scripts/make-platform-admin.mjs pessoa@exemplo.com            concede
//   node scripts/make-platform-admin.mjs pessoa@exemplo.com --revoke   retira
//   node scripts/make-platform-admin.mjs --list                        lista os administradores
// É a ÚNICA forma de conceder este privilégio: nenhuma rota, formulário ou convite da aplicação o faz. Corre no
// servidor (ou na sua máquina) com a ligação direta à base de dados (DIRECT_URL).
import pg from "pg";

process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
await client.connect();
try {
  if (args.includes("--list")) {
    const { rows } = await client.query(`select email, name from "User" where is_platform_admin = true order by email`);
    console.log(rows.length ? rows.map((r) => `- ${r.email}${r.name ? ` (${r.name})` : ""}`).join("\n") : "Nenhum administrador da plataforma.");
  } else {
    const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
    if (!email) {
      console.error("Uso: node scripts/make-platform-admin.mjs <email> [--revoke] | --list");
      process.exitCode = 1;
    } else {
      const revoke = args.includes("--revoke");
      const { rowCount } = await client.query(`update "User" set is_platform_admin = $2 where email = $1`, [email, !revoke]);
      console.log(rowCount ? `${email}: ${revoke ? "acesso de administrador retirado" : "agora é administrador da plataforma"}.` : `Nenhum utilizador com o e-mail ${email} (tem de se registar primeiro).`);
      if (!rowCount) process.exitCode = 1;
    }
  }
} finally {
  await client.end();
}
