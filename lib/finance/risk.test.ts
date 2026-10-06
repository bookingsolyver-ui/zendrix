import assert from "node:assert/strict";
import test from "node:test";
import { expectedProposal, expectedReceivable, nextMonthRange, riskScore, tierOf, winRate } from "./risk.ts";

const paid = (daysLate: number) => ({ daysLate, settled: true });

test("o exemplo do pedido: 3 faturas pagas com mais de 10 dias de atraso => risco elevado", () => {
  const r = riskScore([paid(11), paid(12), paid(14)]);
  assert.equal(r.tier, "high");
  assert.ok(r.score >= 0.7);
  assert.match(r.reason, /últimas 3 faturas/);
});

test("quem paga a tempo é de risco baixo; sem histórico é neutro", () => {
  assert.equal(riskScore([paid(0), paid(-2), paid(0)]).tier, "low");
  const none = riskScore([]);
  assert.deepEqual([none.sample, none.tier], [0, "medium"]);
});

test("as faturas recentes pesam mais do que as antigas", () => {
  const improving = riskScore([paid(0), paid(0), paid(30), paid(30)]);
  const worsening = riskScore([paid(30), paid(30), paid(0), paid(0)]);
  assert.ok(improving.score < worsening.score);
});

test("uma fatura vencida e por pagar conta como atraso", () => {
  assert.ok(riskScore([{ daysLate: 20, settled: false }]).score > riskScore([paid(0)]).score);
});

test("taxa de ganho suavizada e valores esperados", () => {
  assert.equal(winRate(1, 0).rate < 0.5, true); // 1 ganho em 1 não é 100%
  assert.ok(winRate(80, 20).rate > 0.75);
  assert.equal(expectedProposal(100_000, 0.5, 0.2), 40_000);
  assert.equal(expectedReceivable(100_000, 0.25), 75_000);
  assert.equal(tierOf(0.6), "high");
});

test("próximo mês civil, também na passagem de ano", () => {
  assert.equal(nextMonthRange(new Date("2026-12-15T10:00:00Z")).label, "2027-01");
  assert.equal(nextMonthRange(new Date("2026-10-31T23:00:00Z")).start.toISOString(), "2026-11-01T00:00:00.000Z");
});
