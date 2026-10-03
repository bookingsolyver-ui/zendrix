// Preparação para a Meta (App Review, webhook, Embedded Signup): verifica a configuração e, se der um endereço,
// testa o que a Meta vai ver nesse endereço. NÃO faz parte do `npm run check` (depende do ambiente).
//
//   node scripts/check-meta-readiness.mjs                          só a configuração (.env.local / ambiente)
//   node scripts/check-meta-readiness.mjs --url https://o-dominio  + testes ao vivo (páginas legais, webhook, callback...)
//
// Para ver as variáveis de produção: `vercel env pull .env.production.local` e
// `node --env-file=.env.production.local scripts/check-meta-readiness.mjs --url https://...`
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // ficheiro em falta: usa o ambiente
  }
}

const urlIndex = process.argv.indexOf("--url");
const base = urlIndex !== -1 ? process.argv[urlIndex + 1]?.replace(/\/+$/, "") : null;

let failures = 0;
let warnings = 0;
const line = (symbol, label, detail = "") => console.log(`${symbol} ${label}${detail ? ` — ${detail}` : ""}`);
const pass = (label, detail) => line("✔", label, detail);
const fail = (label, detail) => (failures++, line("✘", label, detail));
const warn = (label, detail) => (warnings++, line("⚠", label, detail));
const env = (name) => process.env[name]?.trim();
// Passa ou falha conforme a condição.
const check = (condition, label, passDetail, failDetail) => {
  if (condition) pass(label, passDetail);
  else fail(label, failDetail);
};

// ------------------------------------------------------------------------------------------- configuração
console.log("\n== Configuração");
const required = [
  ["NEXT_PUBLIC_META_APP_ID", "ID da app da Meta (link do login e SDK)"],
  ["META_APP_SECRET", "segredo da app (assinatura dos webhooks, login, callback de eliminação)"],
  ["WHATSAPP_VERIFY_TOKEN", "token de verificação do webhook"],
  ["INTEGRATION_ENCRYPTION_KEY", "cifra dos tokens dos canais"],
  ["CRON_SECRET", "protege o worker da fila de saída"],
  ["NEXT_PUBLIC_COMPANY_NAME", "nome da entidade nos Termos e na Privacidade"],
  ["NEXT_PUBLIC_COMPANY_ADDRESS", "morada da entidade nos Termos e na Privacidade"],
  ["NEXT_PUBLIC_SUPPORT_EMAIL", "contacto de privacidade e eliminação de dados"],
];
for (const [name, why] of required) check(Boolean(env(name)), name, undefined, `falta: ${why}`);

const recommended = [
  ["NEXT_PUBLIC_APP_URL", "endereço público (links dos e-mails e regressos do Stripe/Meta)"],
  ["RESEND_API_KEY", "e-mails de registo, recuperação e convites pelo Resend"],
  ["EMAIL_FROM", "remetente de um domínio verificado no Resend"],
  ["SUPABASE_SERVICE_ROLE_KEY", "gerir contas de Auth (convites, eliminar conta, e-mails pelo Resend)"],
];
for (const [name, why] of recommended) {
  if (env(name)) pass(name);
  else warn(name, `recomendada: ${why}`);
}

if (env("NEXT_PUBLIC_META_WA_CONFIG_ID")) pass("NEXT_PUBLIC_META_WA_CONFIG_ID", "Embedded Signup do WhatsApp ativo");
else warn("NEXT_PUBLIC_META_WA_CONFIG_ID", "sem ela o WhatsApp liga-se pelo ecrã manual (token + Phone ID); ver docs/META_APP_REVIEW.md");

const appUrl = env("NEXT_PUBLIC_APP_URL");
if (appUrl && !appUrl.startsWith("https://")) warn("NEXT_PUBLIC_APP_URL", "em produção tem de ser https://");

// ------------------------------------------------------------------------------------------------ ao vivo
if (!base) {
  console.log("\nSem --url: testes ao vivo saltados. Use --url https://o-dominio para os correr.");
} else {
  console.log(`\n== Ao vivo: ${base}`);
  if (!base.startsWith("https://")) warn("HTTPS", "a Meta exige URLs https:// para os webhooks e páginas legais");

  const get = async (path, init) => {
    try {
      return await fetch(base + path, { redirect: "manual", ...init });
    } catch (err) {
      return { status: 0, error: String(err), headers: new Headers(), text: async () => "" };
    }
  };

  const privacy = await get("/en/privacy");
  const privacyHtml = privacy.status === 200 ? await privacy.text() : "";
  check(privacy.status === 200, "Política de Privacidade pública", "/en/privacy → 200", `/en/privacy → ${privacy.status} (tem de ser 200, sem login)`);
  const lc = privacyHtml.toLowerCase();
  for (const [needle, why] of [["data deletion", "ligação/instruções de eliminação de dados"], ["meta", "referência aos dados da Meta"], ["supabase", "subcontratantes"], ["stripe", "subcontratantes"]]) {
    check(lc.includes(needle), `Privacidade menciona: ${why}`, undefined, `não encontrei "${needle}"`);
  }
  const company = env("NEXT_PUBLIC_COMPANY_NAME");
  if (company) {
    check(lc.includes(company.toLowerCase()), "Privacidade identifica a entidade", company, `"${company}" não aparece na página (rebuild depois de definir a variável?)`);
  }

  for (const [path, label] of [["/en/terms", "Termos de Serviço"], ["/en/data-deletion", "Instruções de eliminação de dados"], ["/en/data-deletion/status", "Estado do pedido de eliminação"]]) {
    const r = await get(path);
    check(r.status === 200, `${label} pública`, `${path} → 200`, `${path} → ${r.status}`);
  }

  const headers = privacy.headers;
  for (const name of ["x-content-type-options", "x-frame-options", "referrer-policy", "strict-transport-security"]) {
    check(Boolean(headers.get(name)), `Cabeçalho ${name}`, headers.get(name) ?? "", "em falta");
  }

  const del = await get("/api/meta/data-deletion", { method: "POST" });
  check(
    del.status === 400,
    "Callback de eliminação de dados ativo",
    "POST sem assinatura → 400",
    del.status === 503 ? "503: META_APP_SECRET não está definido no servidor" : `/api/meta/data-deletion → ${del.status} (esperado 400)`,
  );

  for (const path of ["/api/meta/webhook", "/api/webhooks/whatsapp"]) {
    const bad = await get(`${path}?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1`);
    check(bad.status === 403, `Webhook ${path} recusa token errado`, "403", `→ ${bad.status}`);
    const token = env("WHATSAPP_VERIFY_TOKEN");
    if (token) {
      const good = await get(`${path}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=424242`);
      const body = good.status === 200 ? await good.text() : "";
      check(
        good.status === 200 && body === "424242",
        `Webhook ${path} verifica com o token certo`,
        "devolve o challenge",
        `→ ${good.status} (o WHATSAPP_VERIFY_TOKEN do servidor é diferente do deste ambiente?)`,
      );
    }
    const unsigned = await get(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    check(
      unsigned.status === 401,
      `Webhook ${path} exige assinatura`,
      "POST sem assinatura → 401",
      unsigned.status === 503 ? "503: META_APP_SECRET não está definido no servidor" : `→ ${unsigned.status}`,
    );
  }

  const cron = await get("/api/cron/process-outbox");
  check([401, 503].includes(cron.status), "Worker da fila não é público", `sem credenciais → ${cron.status}`, `→ ${cron.status} (devia ser 401)`);

  const oauth = await get("/api/meta/oauth?code=x&state=0000000000000000");
  check([302, 307].includes(oauth.status), "Callback OAuth recusa pedidos sem estado válido", `→ ${oauth.status}`, `→ ${oauth.status}`);
}

console.log(`\n${failures === 0 ? "Pronto" : "Ainda não está pronto"}: ${failures} falha(s), ${warnings} aviso(s).`);
process.exit(failures === 0 ? 0 : 1);
