import assert from "node:assert/strict";
import test from "node:test";
import { daysSince, marginImpact, parseRates, rateDriftPercent, readThresholds } from "./risk.ts";

test("dias sem resposta", () => {
  assert.equal(daysSince(new Date("2026-10-01T12:00:00Z"), new Date("2026-10-16T11:00:00Z")), 14);
  assert.equal(daysSince(new Date("2026-10-01T12:00:00Z"), new Date("2026-10-16T12:00:00Z")), 15);
});

test("desvio cambial e impacto na margem", () => {
  assert.equal(rateDriftPercent(0.92, 0.88), -4.35);
  assert.equal(rateDriftPercent(0, 0.88), 0); // sem referência não há alerta
  assert.equal(marginImpact(100_000, 0.92, 0.88), -40); // 1000 USD a 4 cêntimos de EUR a menos
});

test("limiares e taxas do ambiente: valores inválidos caem para o padrão", () => {
  assert.deepEqual(readThresholds({ SMART_ALERT_CHURN_DAYS: "15", SMART_ALERT_MARGIN_DRIFT_PERCENT: "x" }), { churnDays: 15, marginDriftPercent: 3 });
  assert.deepEqual(parseRates('{"usd":0.9,"BAD":"x","NEG":-1}'), { USD: 0.9 });
  assert.deepEqual(parseRates("não é json"), {});
});
