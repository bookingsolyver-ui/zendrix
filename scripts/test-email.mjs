// Envia um e-mail de teste pelo Resend com as MESMAS variáveis da aplicação, para validar a configuração
// (chave, remetente e domínio verificado) antes de contar com ela. Não usa código da app.
//
//   node scripts/test-email.mjs o-seu-email@exemplo.com
//
// Lê RESEND_API_KEY, EMAIL_FROM e (opcional) EMAIL_REPLY_TO de .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: usa as variáveis já definidas no ambiente
}

const to = process.argv[2]?.trim();
const key = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim();

if (!to || !key || !from) {
  console.error("Uso: node scripts/test-email.mjs <destinatário>   (precisa de RESEND_API_KEY e EMAIL_FROM)");
  console.error(`  RESEND_API_KEY: ${key ? "definida" : "FALTA"} · EMAIL_FROM: ${from ? from : "FALTA"}`);
  process.exit(1);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "Teste de e-mail da Kwanza Flow",
    text: "Se está a ler isto, o envio de e-mails da Kwanza Flow pelo Resend está a funcionar.",
    html: "<p>Se está a ler isto, o envio de e-mails da <strong>Kwanza Flow</strong> pelo Resend está a funcionar.</p>",
    ...(process.env.EMAIL_REPLY_TO?.trim() ? { reply_to: process.env.EMAIL_REPLY_TO.trim() } : {}),
  }),
});
const body = await res.json().catch(() => null);

if (res.ok) {
  console.log(`Enviado (id ${body?.id}). Veja a caixa de entrada de ${to} (e o spam).`);
} else {
  console.error(`Falhou: HTTP ${res.status} ${body?.name ?? ""} ${body?.message ?? ""}`);
  if (res.status === 403 || /domain/i.test(body?.message ?? "")) {
    console.error("Dica: o domínio do EMAIL_FROM tem de estar verificado no Resend (registos SPF e DKIM no DNS).");
  }
  process.exit(1);
}
