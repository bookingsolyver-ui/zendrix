import { test } from "node:test";
import assert from "node:assert/strict";
import { accountApprovedEmail, accountRejectedEmail, confirmSignupEmail, emailLang, endingSoonEmail, inviteEmail, passwordResetEmail, pendingReviewEmail, subscriptionRenewedEmail, systemNoticeEmail, welcomeEmail } from "./templates.ts";
import { isRetryableStatus, sendEmail } from "./send.ts";

const LANGS = ["pt", "en", "es"] as const;
const URL_ = "https://app.test/pt/confirm?token_hash=abc&type=signup";

test("modelos: todos têm assunto, texto e HTML nas três línguas e levam o link nos dois formatos", () => {
  for (const lang of LANGS) {
    for (const mail of [
      confirmSignupEmail({ name: "Ana", url: URL_, lang }),
      welcomeEmail({ name: "Ana", dashboardUrl: URL_, lang }),
      passwordResetEmail({ url: URL_, lang }),
      inviteEmail({ workspaceName: "Loja", inviterName: "Rui", role: "STAFF", url: URL_, lang }),
      accountApprovedEmail({ name: "Ana", loginUrl: URL_, lang }),
      endingSoonEmail({ name: "Ana", orgName: "Loja", kind: "trial", daysLeft: 5, endsAt: new Date("2026-10-08T12:00:00Z"), billingUrl: URL_, lang }),
      endingSoonEmail({ name: "Ana", orgName: "Loja", kind: "subscription", daysLeft: 1, endsAt: new Date("2026-10-04T12:00:00Z"), billingUrl: URL_, lang }),
      subscriptionRenewedEmail({ name: "Ana", orgName: "Loja", plan: "Pro", renewedUntil: new Date("2026-11-03T12:00:00Z"), priceLabel: "29 € / mês", billingUrl: URL_, lang }),
    ]) {
      assert.ok(mail.subject.length > 5 && mail.text.length > 40 && mail.html.startsWith("<!doctype html>"), `${lang}: ${mail.subject}`);
      assert.ok(mail.text.includes(URL_) && mail.html.includes("token_hash=abc"), `${lang}: o link tem de ir nos dois formatos (${mail.subject})`);
      assert.ok(mail.html.includes(`<html lang="${lang}">`));
      assert.ok(!/undefined|\[object|null/.test(mail.subject + mail.text), `${lang}: sem lixo (${mail.subject})`);
    }
    for (const mail of [pendingReviewEmail({ name: "Ana", lang }), accountRejectedEmail({ name: "Ana", reason: "Motivo X", lang }), systemNoticeEmail({ kind: "notice", text: { subject: "Assunto", body: "Corpo" }, lang })]) {
      assert.ok(mail.subject.length > 5 && mail.text.length > 40 && mail.html.startsWith("<!doctype html>"));
      assert.ok(!/undefined|\[object/.test(mail.subject + mail.text));
    }
  }
});

test("modelos: cada língua tem o seu texto (nada fica em inglês no espanhol, nem em português no inglês)", () => {
  const subject = (lang: (typeof LANGS)[number]) => pendingReviewEmail({ lang }).subject;
  assert.equal(new Set(LANGS.map(subject)).size, 3);
  assert.match(subject("pt"), /Recebemos/);
  assert.match(subject("en"), /received/);
  assert.match(subject("es"), /Recibimos/);
  assert.match(confirmSignupEmail({ url: URL_, lang: "es" }).subject, /Confirma/);
  assert.match(passwordResetEmail({ url: URL_, lang: "es" }).subject, /Restablece/);
  assert.match(inviteEmail({ workspaceName: "Loja", inviterName: "Rui", role: "MANAGER", url: URL_, lang: "es" }).text, /Gestor/);
  assert.match(inviteEmail({ workspaceName: "Loja", inviterName: "Rui", role: "OWNER", url: URL_, lang: "en" }).text, /Owner/);
  assert.equal(emailLang("es"), "es");
  assert.equal(emailLang("en"), "en");
  assert.equal(emailLang("pt"), "pt");
  assert.equal(emailLang(undefined), "pt");
  assert.equal(emailLang("fr"), "pt");
});

test("conta aprovada: o teste de 14 dias e o link de entrada; rejeitada: o motivo, de forma transparente", () => {
  const approved = accountApprovedEmail({ name: "Ana", loginUrl: "https://app.test/pt/login", lang: "pt" });
  assert.match(approved.text, /14 dias/);
  assert.ok(approved.text.includes("https://app.test/pt/login"));
  const rejected = accountRejectedEmail({ name: "Ana", reason: "Não conseguimos confirmar a empresa.\nTente com o NIF.", supportEmail: "ajuda@exemplo.test", lang: "pt" });
  assert.ok(rejected.text.includes("Não conseguimos confirmar a empresa.") && rejected.text.includes("Tente com o NIF."));
  assert.ok(rejected.text.includes("ajuda@exemplo.test"));
  assert.ok(rejected.html.includes("<br>"), "as linhas do motivo mantêm-se");
  assert.ok(!/culpa|infelizmente você/i.test(rejected.text));
});

test("aviso de fim: dias, data e o tipo (teste ou subscrição) na língua certa", () => {
  const trial = endingSoonEmail({ orgName: "Loja", kind: "trial", daysLeft: 5, endsAt: new Date("2026-10-08T12:00:00Z"), billingUrl: URL_, lang: "pt" });
  assert.match(trial.subject, /teste grátis de Loja termina em 5 dias/);
  assert.match(trial.text, /8 de outubro de 2026/);
  const sub = endingSoonEmail({ orgName: "Loja", kind: "subscription", daysLeft: 1, endsAt: new Date("2026-10-08T12:00:00Z"), billingUrl: URL_, lang: "en" });
  assert.match(sub.subject, /subscription of Loja ends in 1 day$/);
  assert.match(endingSoonEmail({ orgName: "Loja", kind: "trial", daysLeft: 3, endsAt: new Date("2026-10-08T12:00:00Z"), billingUrl: URL_, lang: "es" }).text, /8 de octubre de 2026/);
});

test("renovação: organização, plano, valor (se existir) e próxima data", () => {
  const mail = subscriptionRenewedEmail({ orgName: "Loja", plan: "Pro", renewedUntil: new Date("2026-11-03T12:00:00Z"), priceLabel: "29 € / mês", billingUrl: URL_, lang: "pt" });
  for (const text of ["Loja", "Pro", "29 € / mês", "3 de novembro de 2026"]) assert.ok(mail.text.includes(text), text);
  const noPrice = subscriptionRenewedEmail({ orgName: "Loja", plan: null, renewedUntil: new Date("2026-11-03T12:00:00Z"), billingUrl: URL_, lang: "en" });
  assert.ok(noPrice.text.includes("Zetrix") && !noPrice.text.includes("Amount"));
});

test("avisos do sistema: manutenção mostra a janela; o texto do administrador é escapado e respeita parágrafos", () => {
  const mail = systemNoticeEmail({ kind: "maintenance", text: { subject: "Manutenção <b>sábado</b>", body: "Linha 1\nLinha 2\n\nSegundo parágrafo <script>x</script>" }, startsAt: new Date("2026-10-10T01:00:00Z"), endsAt: new Date("2026-10-10T03:00:00Z"), lang: "pt" });
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<b>sábado"));
  assert.ok(mail.html.includes("Linha 1<br>Linha 2") && mail.html.includes("Segundo parágrafo"));
  assert.match(mail.text, /Manutenção programada/);
  assert.match(mail.text, /10 de outubro de 2026/);
  const notice = systemNoticeEmail({ kind: "notice", text: { subject: "Novidade", body: "Texto" }, lang: "es" });
  assert.match(notice.text, /Aviso importante/);
  assert.ok(!/Durante la intervención/.test(notice.text), "só a manutenção avisa de indisponibilidade");
});

test("modelos: nomes e URLs de fora são escapados (nada de HTML injetado)", () => {
  const evil = `<script>alert(1)</script>"&`;
  const mail = inviteEmail({ workspaceName: evil, inviterName: evil, role: "MANAGER", url: `https://x.test/?a="><img src=x>`, lang: "pt" });
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<img src=x>"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
  for (const lang of LANGS) {
    assert.ok(!welcomeEmail({ name: evil, dashboardUrl: "https://x.test", lang }).html.includes("<script>"));
    assert.ok(!accountRejectedEmail({ name: evil, reason: evil, supportEmail: evil, lang }).html.includes("<script>"));
    assert.ok(!endingSoonEmail({ name: evil, orgName: evil, kind: "trial", daysLeft: 2, endsAt: new Date(), billingUrl: "https://x.test", lang }).html.includes("<script>"));
  }
});

test("envio: só repete 429 e 5xx", () => {
  assert.ok(isRetryableStatus(429) && isRetryableStatus(500) && isRetryableStatus(503));
  assert.ok(!isRetryableStatus(400) && !isRetryableStatus(401) && !isRetryableStatus(403) && !isRetryableStatus(422));
});

const mail = { to: "a@b.test", subject: "s", text: "t", html: "<p>t</p>" };

test("envio: sem configuração não envia (e não chama a rede)", async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  let calls = 0;
  const result = await sendEmail(mail, (async () => { calls++; return new Response("{}"); }) as typeof fetch);
  assert.deepEqual(result, { ok: false, error: "not_configured" });
  assert.equal(calls, 0);
});

test("envio: repete em 429/5xx até conseguir, com a chave de idempotência e o remetente certos", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Zetrix <no-reply@exemplo.test>";
  process.env.EMAIL_REPLY_TO = "ajuda@exemplo.test";
  const seen: { headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const statuses = [429, 503, 200];
  const fake = (async (_url: string, init: RequestInit) => {
    seen.push({ headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    const status = statuses.shift()!;
    return new Response(JSON.stringify(status === 200 ? { id: "email_1" } : { message: "x" }), { status });
  }) as unknown as typeof fetch;
  const result = await sendEmail({ ...mail, idempotencyKey: "k-1" }, fake);
  assert.deepEqual(result, { ok: true, id: "email_1" });
  assert.equal(seen.length, 3);
  for (const call of seen) {
    assert.equal(call.headers["Idempotency-Key"], "k-1");
    assert.equal(call.headers.Authorization, "Bearer re_test");
    assert.equal(call.body.from, "Zetrix <no-reply@exemplo.test>");
    assert.equal(call.body.reply_to, "ajuda@exemplo.test");
    assert.deepEqual(call.body.to, ["a@b.test"]);
  }
});

test("envio: um erro 4xx (ex.: domínio por verificar) não se repete", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "x@y.test";
  let calls = 0;
  const result = await sendEmail(mail, (async () => { calls++; return new Response("{}", { status: 403 }); }) as unknown as typeof fetch);
  assert.deepEqual(result, { ok: false, error: "http_403" });
  assert.equal(calls, 1);
});
