import assert from "node:assert/strict";
import test from "node:test";
import { HANDOFF_TASKS, isHandoffTransition, isTerminal } from "./state-machine.ts";

test("só a chegada a WON dispara o handoff (e só uma vez)", () => {
  assert.equal(isHandoffTransition("PAYMENT_SENT", "WON"), true);
  assert.equal(isHandoffTransition(null, "WON"), true);
  assert.equal(isHandoffTransition("WON", "WON"), false);
  assert.equal(isHandoffTransition("NEW", "QUALIFIED"), false);
  assert.equal(isTerminal("WON"), true);
});

test("duas tarefas, uma por departamento", () => {
  assert.match(HANDOFF_TASKS.FINANCE.title("Ana"), /Financeiro.*Ana/);
  assert.match(HANDOFF_TASKS.LOGISTICS.title("Ana"), /Logística.*Ana/);
});
