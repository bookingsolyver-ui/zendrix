import assert from "node:assert/strict";
import test from "node:test";
import { isApprovable, proposalInputSchema, totalOf } from "./lines.ts";

test("o total vem das linhas e o formato é validado", () => {
  assert.equal(totalOf([{ description: "A", quantity: 3, unitMinor: 1000 }, { description: "B", quantity: 1, unitMinor: 500 }]), 3500);
  assert.equal(proposalInputSchema.safeParse({ contactId: "c", title: "T", currency: "aoa", lines: [{ description: "A", quantity: 0, unitMinor: 1 }] }).success, false);
  const ok = proposalInputSchema.safeParse({ contactId: "c", title: "T", currency: "aoa", lines: [{ description: "A", quantity: 1, unitMinor: 1 }] });
  assert.ok(ok.success && ok.data.currency === "AOA");
});

test("só se aprova o que está enviado e dentro do prazo", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  const future = new Date("2026-10-10T10:00:00Z");
  assert.equal(isApprovable({ status: "SENT", tokenExpiresAt: future }, now), true);
  assert.equal(isApprovable({ status: "APPROVED", tokenExpiresAt: future }, now), false);
  assert.equal(isApprovable({ status: "SENT", tokenExpiresAt: new Date("2026-10-07T09:00:00Z") }, now), false);
});
