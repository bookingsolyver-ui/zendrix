import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmSignupEmail, emailLang, inviteEmail, passwordResetEmail, welcomeEmail } from "./templates.ts";
import { isRetryableStatus, sendEmail } from "./send.ts";

test("modelos: todos têm assunto, texto e HTML nas duas línguas e levam o link", () => {
  const url = "https://app.test/pt/confirm?token_hash=abc&type=signup";
  for (const lang of ["pt", "en"] as const) {
    for (const mail of [
      confirmSignupEmail({ name: "Ana", url, lang }),
      welcomeEmail({ name: "Ana", dashboardUrl: url, lang }),
      passwordResetEmail({ url, lang }),
      inviteEmail({ workspaceName: "Loja", inviterName: "Rui", role: "STAFF", url, lang }),
    ]) {
      assert.ok(mail.subject.length > 5 && mail.text.length > 20 && mail.html.startsWith("<!doctype html>"));
      assert.ok(mail.text.includes(url) && mail.html.includes("token_hash=abc"), "o link tem de ir nos dois formatos");
    }
  }
  assert.ok(confirmSignupEmail({ url, lang: "pt" }).subject.includes("Confirme"));
  assert.ok(confirmSignupEmail({ url, lang: "en" }).subject.includes("Confirm"));
  assert.equal(emailLang("es"), "en");
  assert.equal(emailLang("pt"), "pt");
});

test("modelos: nomes e URLs de fora são escapados (nada de HTML injetado)", () => {
  const evil = `<script>alert(1)</script>"&`;
  const mail = inviteEmail({ workspaceName: evil, inviterName: evil, role: "MANAGER", url: `https://x.test/?a="><img src=x>`, lang: "pt" });
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<img src=x>"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
  const welcome = welcomeEmail({ name: evil, dashboardUrl: "https://x.test", lang: "en" });
  assert.ok(!welcome.html.includes("<script>"));
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
