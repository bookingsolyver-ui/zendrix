import assert from "node:assert/strict";
import test from "node:test";
import { buildReminder, isReminderDue, toneFor } from "./dunning.ts";

const now = new Date("2026-10-10T10:00:00Z");
const base = { status: "PENDING", dueAt: new Date("2026-10-09T09:00:00Z"), remindersSent: 0, lastReminderAt: null as Date | null };

test("só cobra o vencido há 1+ dia, pendente, e com intervalo entre lembretes", () => {
  assert.equal(isReminderDue(base, now), true);
  assert.equal(isReminderDue({ ...base, dueAt: new Date("2026-10-10T08:00:00Z") }, now), false); // vence hoje
  assert.equal(isReminderDue({ ...base, status: "PAID" }, now), false);
  assert.equal(isReminderDue({ ...base, remindersSent: 6 }, now), false);
  assert.equal(isReminderDue({ ...base, remindersSent: 1, lastReminderAt: new Date("2026-10-09T10:00:00Z") }, now), false);
  assert.equal(isReminderDue({ ...base, remindersSent: 1, lastReminderAt: new Date("2026-10-07T09:00:00Z") }, now), true);
});

test("o tom escala depois de 3 lembretes", () => {
  assert.deepEqual([0, 2, 3, 4, 5].map(toneFor), ["friendly", "friendly", "firm", "firm", "final"]);
});

test("mensagem: fatura, valor, vencimento e referência", () => {
  const text = buildReminder({ name: "Ana Silva", reference: "FT 2026/12", amountMinor: 15_000_000, currency: "AOA", dueAt: base.dueAt, paymentReference: "123 456 789", remindersSent: 0, now });
  assert.match(text, /Olá Ana/);
  assert.match(text, /FT 2026\/12/);
  assert.match(text, /venceu ontem/);
  assert.match(text, /123 456 789/);
  assert.match(buildReminder({ name: null, reference: "X", amountMinor: 100, currency: "EUR", dueAt: base.dueAt, paymentReference: null, remindersSent: 4, now }), /continua por regularizar/);
});
