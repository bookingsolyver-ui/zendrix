import assert from "node:assert/strict";
import test from "node:test";
import { campaignInputSchema, finalStatus, firstName, percent, renderMessage, resolveSchedule, unknownPlaceholders } from "./schema.ts";

const NOW = new Date("2026-10-03T12:00:00Z");
const base = { name: "Promo", message: "Olá {{nome}}, temos uma oferta!", segment: "builtin:won", schedule: { mode: "now" as const } };

test("a campanha aceita {{nome}} e recusa outras variáveis", () => {
  assert.ok(campaignInputSchema.safeParse(base).success);
  assert.ok(campaignInputSchema.safeParse({ ...base, message: "Olá {{ Nome }}" }).success);
  assert.equal(campaignInputSchema.safeParse({ ...base, message: "Pedido {{1}}" }).success, false);
  assert.deepEqual(unknownPlaceholders("{{nome}} {{valor}} {{1}}"), ["valor", "1"]);
});

test("validação do nome, da mensagem e do segmento", () => {
  assert.equal(campaignInputSchema.safeParse({ ...base, name: " " }).success, false);
  assert.equal(campaignInputSchema.safeParse({ ...base, message: "x".repeat(1001) }).success, false);
  assert.equal(campaignInputSchema.safeParse({ ...base, segment: "segmento-qualquer" }).success, false);
  assert.ok(campaignInputSchema.safeParse({ ...base, segment: "custom:abc_123" }).success);
});

test("{{nome}} usa o primeiro nome; sem nome, não deixa lixo", () => {
  assert.equal(renderMessage("Olá {{nome}}, temos uma oferta!", "Maria Silva"), "Olá Maria, temos uma oferta!");
  assert.equal(renderMessage("Olá {{nome}}, temos uma oferta!", null), "Olá, temos uma oferta!");
  assert.equal(renderMessage("Olá {{nome}}, temos uma oferta!", "+351 912"), "Olá, temos uma oferta!");
  assert.equal(renderMessage("Olá {{ NOME }}!", "Rui"), "Olá Rui!");
  assert.equal(firstName("  ana  paula "), "ana");
});

test("agendamento: já, no futuro dentro do limite, nunca no passado nem a mais de 90 dias", () => {
  assert.equal(resolveSchedule({ mode: "now" }, NOW)?.getTime(), NOW.getTime());
  assert.equal(resolveSchedule({ mode: "later", at: "2026-10-04T09:00:00.000Z" }, NOW)?.toISOString(), "2026-10-04T09:00:00.000Z");
  assert.equal(resolveSchedule({ mode: "later", at: "2026-10-03T11:00:00.000Z" }, NOW), null);
  assert.equal(resolveSchedule({ mode: "later", at: "2026-10-03T12:00:30.000Z" }, NOW), null);
  assert.equal(resolveSchedule({ mode: "later", at: "2027-03-01T09:00:00.000Z" }, NOW), null);
});

test("estado final e percentagens", () => {
  assert.equal(finalStatus({ queued: 0, sent: 0, delivered: 0, read: 0, failed: 3, skipped: 2 }), "FAILED");
  assert.equal(finalStatus({ queued: 1, sent: 0, delivered: 0, read: 0, failed: 3, skipped: 0 }), "COMPLETED");
  assert.equal(finalStatus({ queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 5 }), "COMPLETED");
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(1, 0), 0);
});
