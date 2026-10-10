import test from "node:test";
import assert from "node:assert/strict";
import { betweenMessagesMs, recordingMs, sendWindows, typingMs } from "./humanize.ts";
import { createHmac } from "node:crypto";
import { isQrAccount, isValidSignature, parseBaseUrl, sessionNameFor, webhookSecret } from "./config.ts";
import { parseOpenWaWebhook } from "./parse.ts";

test("typingMs cresce com o texto e fica entre 1 e 5,5 s", () => {
  const short = typingMs("ok", () => 0.5);
  const long = typingMs("x".repeat(400), () => 0.5);
  assert.ok(short >= 1000 && short < long);
  assert.ok(long <= 5500);
});

test("recordingMs e a pausa entre mensagens ficam nos limites", () => {
  assert.ok(recordingMs("olá", () => 0) >= 1800);
  assert.ok(recordingMs("x".repeat(2000), () => 1) <= 7500);
  assert.ok(betweenMessagesMs(() => 0) >= 900 && betweenMessagesMs(() => 0.999) <= 2600);
});

test("um número novo tem limites mais baixos do que um antigo", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const fresh = sendWindows(new Date("2026-10-10T00:00:00Z"), now);
  const old = sendWindows(new Date("2026-08-01T00:00:00Z"), now);
  for (let i = 0; i < fresh.length; i++) assert.ok(fresh[i].limit < old[i].limit);
});

test("config: prefixo, URL, nome da sessão e segredo", () => {
  assert.equal(isQrAccount("qr:abc"), true);
  assert.equal(isQrAccount("123456"), false);
  assert.equal(parseBaseUrl("http://wa.exemplo.com"), null);
  assert.equal(parseBaseUrl("https://wa.exemplo.com/x"), "https://wa.exemplo.com");
  assert.equal(parseBaseUrl("http://localhost:2785"), "http://localhost:2785");
  assert.match(sessionNameFor("clx_ABC-123"), /^kf-[a-z0-9]+$/);
  assert.notEqual(webhookSecret("a", "k"), webhookSecret("b", "k"));
});

test("assinatura do webhook: aceita a certa, recusa corpo alterado ou cabeçalho em falta", () => {
  const secret = webhookSecret("sess-1", "chave");
  const body = '{"event":"message.received"}';
  const header = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(isValidSignature(body, header, secret), true);
  assert.equal(isValidSignature(body + " ", header, secret), false);
  assert.equal(isValidSignature(body, null, secret), false);
  assert.equal(isValidSignature(body, "sha256=abc", secret), false);
});

test("parse: mensagem de texto de um cliente", () => {
  const ev = parseOpenWaWebhook({
    event: "message.received",
    sessionId: "s1",
    data: { id: "3EB0A", from: "244923000111@c.us", chatId: "244923000111@c.us", body: "Olá", type: "text", timestamp: 1760000000, fromMe: false, isGroup: false },
  });
  assert.equal(ev.kind, "message");
  if (ev.kind === "message") {
    assert.equal(ev.message.waId, "244923000111");
    assert.equal(ev.message.accountId, "qr:s1");
    assert.equal(ev.message.body, "Olá");
  }
});

test("parse: nota de voz fica como áudio; grupos, mensagens nossas e @lid são ignorados", () => {
  const mk = (data: object) => parseOpenWaWebhook({ event: "message.received", sessionId: "s1", data: { id: "1", body: "", type: "text", ...data } });
  const voice = mk({ chatId: "1@c.us", type: "voice" });
  assert.equal(voice.kind === "message" && voice.message.type, "audio");
  assert.equal(mk({ chatId: "1@c.us", fromMe: true, body: "x" }).kind, "ignored");
  assert.equal(mk({ chatId: "1@g.us", isGroup: true, body: "x" }).kind, "ignored");
  assert.equal(mk({ chatId: "99@lid", body: "x" }).kind, "ignored");
  assert.equal(mk({ chatId: "1@c.us", type: "revoked", body: "x" }).kind, "ignored");
});

test("parse: estado da sessão", () => {
  assert.deepEqual(parseOpenWaWebhook({ event: "session.status", sessionId: "s1", data: { sessionId: "s1", status: "ready" } }), {
    kind: "status",
    sessionId: "s1",
    status: "ready",
  });
});
