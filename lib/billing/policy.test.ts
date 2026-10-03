import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateAccess, isSubscriptionActive } from "./policy.ts";

const now = new Date("2026-10-10T12:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

test("paywall: quem pode usar o produto", () => {
  assert.deepEqual(evaluateAccess("active", null, now), { active: true });
  assert.deepEqual(evaluateAccess("trialing", inDays(3), now), { active: true });
});

test("paywall: trial acabado, sem data ou no limite exato fica bloqueado", () => {
  assert.deepEqual(evaluateAccess("trialing", inDays(-1), now), { active: false, reason: "trial_expired" });
  assert.deepEqual(evaluateAccess("trialing", now, now), { active: false, reason: "trial_expired" });
  assert.deepEqual(evaluateAccess("trialing", null, now), { active: false, reason: "trial_expired" });
});

test("paywall: past_due e cancelada bloqueiam de imediato; estados desconhecidos também", () => {
  assert.deepEqual(evaluateAccess("past_due", inDays(30), now), { active: false, reason: "past_due" });
  assert.deepEqual(evaluateAccess("canceled", inDays(30), now), { active: false, reason: "canceled" });
  for (const weird of ["", "unpaid", "incomplete", "ACTIVE", "trialing "]) {
    assert.equal(isSubscriptionActive(weird, inDays(30), now), false, JSON.stringify(weird));
  }
});

test("paywall: um trial por acabar com subscrição active (ex.: pagou durante o teste) não é bloqueado", () => {
  assert.equal(isSubscriptionActive("active", inDays(-5), now), true);
});
