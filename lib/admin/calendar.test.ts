import assert from "node:assert/strict";
import test from "node:test";
import { calendarEvents, dayKey, groupByDay, monthGrid, parseMonth, shiftMonth, type CalendarOrg } from "./calendar.ts";

const org = (over: Partial<CalendarOrg>): CalendarOrg => ({ id: "o1", name: "Org", subStatus: "trialing", trialEndsAt: null, periodEnd: null, cancelAtPeriodEnd: false, blocked: false, ...over });

test("cada organização gera no máximo uma data crítica, do tipo certo", () => {
  const events = calendarEvents([
    org({ id: "a", subStatus: "trialing", trialEndsAt: new Date("2026-10-10T12:00:00Z") }),
    org({ id: "b", subStatus: "active", periodEnd: new Date("2026-10-12T12:00:00Z") }),
    org({ id: "c", subStatus: "active", periodEnd: new Date("2026-10-15T12:00:00Z"), cancelAtPeriodEnd: true }),
    org({ id: "d", subStatus: "past_due", periodEnd: new Date("2026-10-20T12:00:00Z") }),
    org({ id: "e", subStatus: "canceled" }),
    org({ id: "f", subStatus: "trialing" }),
  ]);
  assert.deepEqual(events.map((e) => [e.orgId, e.kind]), [["a", "trial_end"], ["b", "renewal"], ["c", "expiry"]]);
});

test("os eventos saem por ordem de data", () => {
  const events = calendarEvents([org({ id: "x", subStatus: "active", periodEnd: new Date("2026-11-01T00:00:00Z") }), org({ id: "y", subStatus: "trialing", trialEndsAt: new Date("2026-10-01T00:00:00Z") })]);
  assert.deepEqual(events.map((e) => e.orgId), ["y", "x"]);
});

test("o dia conta-se no fuso de Lisboa", () => {
  assert.equal(dayKey(new Date("2026-10-03T23:30:00Z")), "2026-10-04"); // 00:30 em Lisboa (verão, UTC+1)
  assert.equal(dayKey(new Date("2026-12-03T23:30:00Z")), "2026-12-03"); // inverno: UTC+0
  const grouped = groupByDay(calendarEvents([org({ id: "a", trialEndsAt: new Date("2026-10-10T10:00:00Z") }), org({ id: "b", trialEndsAt: new Date("2026-10-10T15:00:00Z") })]));
  assert.equal(grouped.get("2026-10-10")?.length, 2);
});

test("o mês vem de um parâmetro seguro e navega em ambos os sentidos", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(parseMonth(undefined, now), "2026-10");
  assert.equal(parseMonth("2026-12", now), "2026-12");
  assert.equal(parseMonth("2026-13", now), "2026-10");
  assert.equal(parseMonth("'; drop", now), "2026-10");
  assert.equal(parseMonth("1999-01", now), "2026-10");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("a grelha do mês começa à segunda e tem semanas de 7 dias", () => {
  const grid = monthGrid("2026-10"); // 1 de outubro de 2026 é quinta-feira
  assert.ok(grid.length >= 5 && grid.every((week) => week.length === 7));
  assert.equal(grid[0][0].key, "2026-09-28");
  assert.equal(grid[0][3].key, "2026-10-01");
  assert.equal(grid[0][3].inMonth, true);
  assert.equal(grid[0][0].inMonth, false);
  assert.equal(grid.flat().filter((cell) => cell.inMonth).length, 31);
});
