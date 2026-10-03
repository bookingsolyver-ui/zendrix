import assert from "node:assert/strict";
import test from "node:test";
import { daysUntil, endingDedupeKey, isEndingSoon, isRenewal, renderNotification } from "./notifications.ts";

const NOW = new Date("2026-10-03T12:00:00Z");

test("fim em breve: só dentro dos próximos 5 dias, nunca no passado", () => {
  assert.equal(isEndingSoon(new Date("2026-10-08T12:00:00Z"), NOW), true);
  assert.equal(isEndingSoon(new Date("2026-10-08T12:00:01Z"), NOW), false);
  assert.equal(isEndingSoon(new Date("2026-10-03T12:00:00Z"), NOW), false);
  assert.equal(isEndingSoon(new Date("2026-10-01T12:00:00Z"), NOW), false);
  assert.equal(isEndingSoon(null, NOW), false);
  assert.equal(daysUntil(new Date("2026-10-08T12:00:00Z"), NOW), 5);
  assert.equal(daysUntil(new Date("2026-10-03T20:00:00Z"), NOW), 1);
  assert.equal(daysUntil(new Date("2026-10-03T12:00:01Z"), NOW), 1);
});

test("a chave do aviso é o dia do fim: um aviso por período, e um novo se o teste for prolongado", () => {
  assert.equal(endingDedupeKey("trial", new Date("2026-10-08T12:00:00Z")), "trial:2026-10-08");
  assert.equal(endingDedupeKey("subscription", new Date("2026-10-08T23:59:00Z")), "subscription:2026-10-08");
  assert.notEqual(endingDedupeKey("trial", new Date("2026-10-08T12:00:00Z")), endingDedupeKey("trial", new Date("2026-10-15T12:00:00Z")));
});

test("renovação: o período pago avançou; a primeira ativação e as repetições não contam", () => {
  assert.equal(isRenewal(new Date("2026-10-03T00:00:00Z"), new Date("2026-11-03T00:00:00Z")), true);
  assert.equal(isRenewal(null, new Date("2026-11-03T00:00:00Z")), false);
  assert.equal(isRenewal(new Date("2026-11-03T00:00:00Z"), new Date("2026-11-03T00:00:00Z")), false);
  assert.equal(isRenewal(new Date("2026-11-03T00:00:00Z"), new Date("2026-11-03T05:00:00Z")), false);
  assert.equal(isRenewal(new Date("2026-11-03T00:00:00Z"), null), false);
});

test("dados -> e-mail: cada tipo gera o e-mail certo, na língua do destinatário", () => {
  const cases: [string, unknown, string][] = [
    ["pending_review", { name: "Ana" }, "Recebemos"],
    ["account_approved", { name: "Ana", loginUrl: "https://app.test/pt/login" }, "aprovada"],
    ["account_rejected", { name: "Ana", reason: "Motivo X" }, "Motivo X"],
    ["ending_soon", { name: "Ana", orgName: "Loja", kind: "trial", endsAt: "2026-10-08T12:00:00.000Z", billingUrl: "https://app.test/billing" }, "5 dias"],
    ["subscription_renewed", { name: "Ana", orgName: "Loja", plan: "Pro", renewedUntil: "2026-11-03T12:00:00.000Z", billingUrl: "https://app.test/billing" }, "renovada"],
    ["system_notice", { kind: "maintenance", content: { pt: { subject: "Manutenção", body: "Sábado" } }, startsAt: "2026-10-10T01:00:00.000Z" }, "Sábado"],
  ];
  for (const [kind, payload, expected] of cases) {
    const result = renderNotification(kind, payload, "pt", NOW);
    assert.ok(result.ok, kind);
    assert.ok(result.ok && (result.email.subject + result.email.text).includes(expected), `${kind} deve conter «${expected}»`);
  }
});

test("avisos do sistema: usa a versão da língua do destinatário e cai no português se faltar", () => {
  const payload = { kind: "notice", content: { pt: { subject: "Aviso PT", body: "Corpo PT" }, en: { subject: "Notice EN", body: "Body EN" } } };
  const en = renderNotification("system_notice", payload, "en", NOW);
  const es = renderNotification("system_notice", payload, "es", NOW);
  assert.ok(en.ok && en.email.subject === "Notice EN");
  assert.ok(es.ok && es.email.subject === "Aviso PT", "sem versão em espanhol usa o português");
  assert.ok(es.ok && /Aviso importante/.test(es.email.text) && !/Aviso importante|Hola/.test("") && !/¡Hola/.test(es.email.text), "e o e-mail inteiro sai em português, sem misturar línguas");
});

test("payload corrompido ou tipo desconhecido não rebenta: devolve o erro", () => {
  assert.deepEqual(renderNotification("account_rejected", { name: "Ana" }, "pt", NOW), { ok: false, error: "invalid_payload" });
  assert.deepEqual(renderNotification("ending_soon", { orgName: "x", kind: "trial", endsAt: "ontem", billingUrl: "https://a.test" }, "pt", NOW), { ok: false, error: "invalid_payload" });
  assert.deepEqual(renderNotification("account_approved", { loginUrl: "javascript:alert(1)" }, "pt", NOW), { ok: false, error: "invalid_payload" });
  assert.deepEqual(renderNotification("inventado", {}, "pt", NOW), { ok: false, error: "unknown_kind" });
});
