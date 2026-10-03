import assert from "node:assert/strict";
import test from "node:test";
import { AUTOMATION_PRESETS, automationInputSchema, describeActions, inCooldown, matchesKeyword, scheduleSteps } from "./schema.ts";

const base = { name: "X", trigger: "NEW_CONTACT", config: { keyword: "" }, actions: [{ type: "SEND_MESSAGE", text: "Olá {{nome}}", delayMinutes: 0 }] };

test("todos os modelos prontos são automações válidas", () => {
  for (const preset of AUTOMATION_PRESETS) assert.ok(automationInputSchema.safeParse(preset.input).success, preset.id);
});

test("validação: nome, ações (1 a 3), esperas e variáveis", () => {
  assert.ok(automationInputSchema.safeParse(base).success);
  assert.equal(automationInputSchema.safeParse({ ...base, name: " " }).success, false);
  assert.equal(automationInputSchema.safeParse({ ...base, actions: [] }).success, false);
  const four = Array.from({ length: 4 }, () => base.actions[0]);
  assert.equal(automationInputSchema.safeParse({ ...base, actions: four }).success, false);
  assert.equal(automationInputSchema.safeParse({ ...base, actions: [{ type: "SEND_MESSAGE", text: "x", delayMinutes: 1381 }] }).success, false);
  assert.equal(automationInputSchema.safeParse({ ...base, actions: [{ type: "SEND_MESSAGE", text: "Pedido {{1}}", delayMinutes: 0 }] }).success, false);
  assert.equal(automationInputSchema.safeParse({ ...base, actions: [{ type: "SEND_MESSAGE", text: "x" }] }).success, true); // espera por omissão = 0
});

test("nunca se pode atribuir a fase Cliente (só o pagamento o faz)", () => {
  assert.equal(automationInputSchema.safeParse({ ...base, actions: [{ type: "SET_STAGE", stage: "WON", delayMinutes: 0 }] }).success, false);
  assert.ok(automationInputSchema.safeParse({ ...base, actions: [{ type: "SET_STAGE", stage: "QUALIFIED", delayMinutes: 0 }] }).success);
});

test("a palavra-chave só existe no gatilho de mensagem recebida", () => {
  assert.equal(automationInputSchema.safeParse({ ...base, config: { keyword: "preço" } }).success, false);
  assert.ok(automationInputSchema.safeParse({ ...base, trigger: "MESSAGE_RECEIVED", config: { keyword: "preço" } }).success);
});

test("palavra-chave: sem distinguir maiúsculas nem acentos; vazia aceita tudo", () => {
  assert.equal(matchesKeyword("Qual é o PREÇO?", "preço"), true);
  assert.equal(matchesKeyword("qual o preco", "Preço"), true);
  assert.equal(matchesKeyword("bom dia", "preço"), false);
  assert.equal(matchesKeyword("bom dia", ""), true);
});

test("as esperas somam-se desde o evento", () => {
  const start = new Date("2026-10-03T12:00:00Z");
  const steps = scheduleSteps([{ type: "SEND_MESSAGE", text: "a", delayMinutes: 0 }, { type: "CREATE_TASK", title: "b", delayMinutes: 30 }, { type: "SET_STAGE", stage: "ENGAGED", delayMinutes: 60 }], start);
  assert.deepEqual(steps.map((s) => s.dueAt.toISOString()), ["2026-10-03T12:00:00.000Z", "2026-10-03T12:30:00.000Z", "2026-10-03T13:30:00.000Z"]);
});

test("intervalo de espera entre execuções e descrição das ações", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(inCooldown(null, now), false);
  assert.equal(inCooldown(new Date("2026-10-03T00:00:00Z"), now), true);
  assert.equal(inCooldown(new Date("2026-10-01T00:00:00Z"), now), false);
  assert.equal(describeActions([{ type: "SEND_MESSAGE", text: "a", delayMinutes: 0 }, { type: "SET_STAGE", stage: "QUALIFIED", delayMinutes: 120 }]), "enviar mensagem → após 2 h: fase → Qualificado");
});
