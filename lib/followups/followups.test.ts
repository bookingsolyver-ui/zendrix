import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FOLLOWUP_CONFIG, decideFollowUp, fallbackFollowUpText, followUpConfigSchema, isQuietHour, localMinutes, parseFollowUpConfig, WINDOW_MS, type FollowUpConfig, type FollowUpFacts } from "./config.ts";

const H = 3_600_000;
const M = 60_000;
// 2026-10-10 12:00 UTC = 13:00 em Lisboa (WEST, UTC+1), a meio do dia (fora das horas de silêncio).
const NOON = Date.UTC(2026, 9, 10, 12, 0, 0);
const config = (over: Partial<FollowUpConfig> = {}): FollowUpConfig => ({ ...DEFAULT_FOLLOWUP_CONFIG, enabled: true, ...over });
const facts = (over: Partial<FollowUpFacts> = {}): FollowUpFacts => ({
  now: NOON,
  config: config(),
  lastInboundAt: NOON - 3 * H,
  lastOutAt: NOON - 150 * M, // nossa última resposta há 2h30
  lastMessageDirection: "OUT",
  sentSinceInbound: 0,
  paused: false,
  optedOut: false,
  stage: "ENGAGED",
  ...over,
});

test("config: os passos têm de caber na janela de 24 h da Meta", () => {
  assert.ok(followUpConfigSchema.safeParse(DEFAULT_FOLLOWUP_CONFIG).success);
  const bad = (steps: number[]) => followUpConfigSchema.safeParse({ ...DEFAULT_FOLLOWUP_CONFIG, steps: steps.map((afterMinutes) => ({ afterMinutes })) }).success;
  assert.ok(bad([120, 1080]));
  assert.ok(bad([30]));
  assert.ok(!bad([24 * 60]), "24 h exatas já é fora da janela");
  assert.ok(!bad([48 * 60]), "48 h exige template: recusado");
  assert.ok(!bad([20 * 60, 4 * 60]), "a soma passa de 23 h");
  assert.ok(!bad([10]), "mínimo de 30 min");
  assert.ok(!bad([]));
  assert.ok(!bad([60, 60, 60, 60]), "no máximo 3 passos");
  assert.ok(bad([60, 60, 60]));
  assert.ok(!followUpConfigSchema.safeParse({ ...DEFAULT_FOLLOWUP_CONFIG, timezone: "Mars/Olympus" }).success);
  assert.ok(!followUpConfigSchema.safeParse({ ...DEFAULT_FOLLOWUP_CONFIG, quietHours: { start: "25:00", end: "08:00" } }).success);
  assert.equal(parseFollowUpConfig(undefined), null);
  assert.equal(parseFollowUpConfig({ enabled: true }), null);
  assert.deepEqual(parseFollowUpConfig(DEFAULT_FOLLOWUP_CONFIG), DEFAULT_FOLLOWUP_CONFIG);
});

test("horas de silêncio: fuso local, intervalo que passa da meia-noite", () => {
  assert.equal(localMinutes(NOON, "Europe/Lisbon"), 13 * 60); // verão
  assert.equal(localMinutes(Date.UTC(2026, 0, 15, 12, 0), "Europe/Lisbon"), 12 * 60); // inverno
  assert.equal(localMinutes(NOON, "Africa/Luanda"), 13 * 60);
  const at = (h: number, m = 0) => Date.UTC(2026, 9, 10, h - 1, m); // hora local de Lisboa (UTC+1)
  for (const [h, quiet] of [[3, true], [7, true], [7.99, true], [8, false], [13, false], [20, false], [21, true], [23, true], [0, true]] as const) {
    assert.equal(isQuietHour(at(Math.floor(h), Math.round((h % 1) * 60)), "Europe/Lisbon", "21:00", "08:00"), quiet, `${h}h`);
  }
  assert.equal(isQuietHour(at(3), "Europe/Lisbon", "08:00", "08:00"), false, "start == end: sem silêncio");
  assert.equal(isQuietHour(at(10), "Europe/Lisbon", "09:00", "12:00"), true, "intervalo dentro do dia");
  assert.equal(isQuietHour(at(13), "Europe/Lisbon", "09:00", "12:00"), false);
});

test("decisão: envia o passo 1 quando venceu, dentro da janela e fora do silêncio", () => {
  assert.deepEqual(decideFollowUp(facts()), { action: "send", step: 1 });
});

test("decisão: ainda não venceu, ou está no silêncio -> espera", () => {
  assert.deepEqual(decideFollowUp(facts({ lastOutAt: NOON - 60 * M })), { action: "wait", reason: "not_due" });
  const night = Date.UTC(2026, 9, 10, 23, 0); // 00:00 em Lisboa
  assert.deepEqual(decideFollowUp(facts({ now: night, lastInboundAt: night - 3 * H, lastOutAt: night - 3 * H })), { action: "wait", reason: "quiet_hours" });
});

test("decisão: cada passo reinicia o relógio e a sequência acaba", () => {
  // passo 2 só às 18 h depois do último envio nosso
  assert.deepEqual(decideFollowUp(facts({ sentSinceInbound: 1, lastInboundAt: NOON - 10 * H, lastOutAt: NOON - 5 * H })), { action: "wait", reason: "not_due" });
  assert.deepEqual(decideFollowUp(facts({ sentSinceInbound: 1, lastInboundAt: NOON - 20 * H, lastOutAt: NOON - 19 * H })), { action: "send", step: 2 });
  assert.deepEqual(decideFollowUp(facts({ sentSinceInbound: 2 })), { action: "stop", reason: "sequence_done" });
});

test("decisão: NUNCA envia fora da janela de 24 h (nem nos últimos 30 minutos)", () => {
  assert.deepEqual(decideFollowUp(facts({ lastInboundAt: NOON - 25 * H, lastOutAt: NOON - 24 * H })), { action: "stop", reason: "window_closed" });
  assert.deepEqual(decideFollowUp(facts({ lastInboundAt: NOON - (WINDOW_MS - 20 * M), lastOutAt: NOON - 5 * H })), { action: "stop", reason: "window_closed" });
  assert.deepEqual(decideFollowUp(facts({ lastInboundAt: NOON - (WINDOW_MS - 40 * M), lastOutAt: NOON - 5 * H })), { action: "send", step: 1 });
});

test("decisão: pára sempre que há motivo (desligado, humano, opt-out, fechado, cliente respondeu)", () => {
  const stop = (over: Partial<FollowUpFacts>) => decideFollowUp(facts(over));
  assert.deepEqual(stop({ config: { ...config(), enabled: false } }), { action: "stop", reason: "disabled" });
  assert.deepEqual(stop({ paused: true }), { action: "stop", reason: "paused" });
  assert.deepEqual(stop({ optedOut: true }), { action: "stop", reason: "opted_out" });
  assert.deepEqual(stop({ stage: "WON" }), { action: "stop", reason: "closed" });
  assert.deepEqual(stop({ stage: "LOST" }), { action: "stop", reason: "closed" });
  assert.deepEqual(stop({ lastMessageDirection: "IN" }), { action: "stop", reason: "customer_replied" });
  assert.deepEqual(stop({ lastMessageDirection: null, lastOutAt: null }), { action: "stop", reason: "customer_replied" });
  assert.deepEqual(stop({ lastInboundAt: null }), { action: "stop", reason: "no_inbound" });
  // opt-out ganha a tudo, mesmo com tudo o resto a favor
  assert.deepEqual(stop({ optedOut: true, stage: "QUALIFIED" }), { action: "stop", reason: "opted_out" });
});

test("texto de recurso: curto, sem promessas, e o último passo despede-se", () => {
  const first = fallbackFollowUpText(1, 2);
  const last = fallbackFollowUpText(2, 2);
  assert.notEqual(first, last);
  for (const text of [first, last]) assert.ok(text.length < 160 && !/desconto|promo|%|€|oferta/i.test(text));
  assert.ok(/não o incomodar|retomar/i.test(last));
});
