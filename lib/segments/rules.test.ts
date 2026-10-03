import assert from "node:assert/strict";
import test from "node:test";
import { describeRules, parseRules, rulesToFilter, segmentInputSchema } from "./rules.ts";

const NOW = new Date("2026-10-03T12:00:00Z");

test("regras vazias: sem filtros, todos os contactos", () => {
  const rules = parseRules({});
  assert.deepEqual(rulesToFilter(rules, NOW), {});
  assert.equal(describeRules(rules), "Todos os contactos");
});

test("regras guardadas inválidas não rebentam: viram sem filtros", () => {
  assert.deepEqual(rulesToFilter(parseRules({ stages: ["INVENTADA"] }), NOW), {});
  assert.deepEqual(rulesToFilter(parseRules(null), NOW), {});
});

test("fases, e-mail, opt-out e data traduzem-se no filtro certo", () => {
  const rules = parseRules({ stages: ["NEW", "ENGAGED"], optedOut: "no", hasEmail: "yes", createdWithinDays: 7 });
  assert.deepEqual(rulesToFilter(rules, NOW), {
    leadStage: { in: ["NEW", "ENGAGED"] },
    optedOutAt: null,
    email: { not: null },
    createdAt: { gte: new Date("2026-09-26T12:00:00Z") },
  });
  assert.equal(describeRules(rules), "Fase: Novo, Em conversa · Criado nos últimos 7 dias · Com e-mail · Aceita automáticas");
});

test("a entrada do segmento exige nome e limita os dias", () => {
  const ok = segmentInputSchema.safeParse({ name: " Clientes ", rules: { createdWithinDays: 30 } });
  assert.ok(ok.success && ok.data.name === "Clientes");
  assert.equal(segmentInputSchema.safeParse({ name: "  ", rules: {} }).success, false);
  assert.equal(segmentInputSchema.safeParse({ name: "x", rules: { createdWithinDays: 0 } }).success, false);
  assert.equal(segmentInputSchema.safeParse({ name: "x", rules: { stages: ["NOPE"] } }).success, false);
});
