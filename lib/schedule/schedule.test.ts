import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SCHEDULE_CONFIG, parseScheduleConfig, scheduleConfigSchema, type ScheduleConfig } from "./config.ts";
import { addDaysISO, computeFreeSlots, dayRangeMs, findSlot, isValidDateISO, tzOffsetMinutes, weekdayOf, zonedToUtcMs } from "./slots.ts";
import { formatMoney, paymentItemInputSchema, parseAmountToMinor } from "../payments/catalog.ts";

const MIN = 60_000;
const H = 60 * MIN;
const cfg = (over: Partial<ScheduleConfig> = {}): ScheduleConfig => ({ ...DEFAULT_SCHEDULE_CONFIG, enabled: true, ...over });
const times = (slots: { time: string }[]) => slots.map((s) => s.time);

test("fusos: deslocamentos e conversão local -> UTC (inclui horário de verão)", () => {
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 6, 1), "Europe/Lisbon"), 60); // verão
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 0, 15), "Europe/Lisbon"), 0); // inverno
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 6, 1), "Africa/Luanda"), 60);
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 6, 1), "America/New_York"), -240);
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 6, 1), "Asia/Kolkata"), 330);
  assert.equal(tzOffsetMinutes(Date.UTC(2026, 6, 1), "UTC"), 0);
  assert.equal(zonedToUtcMs("2026-07-01", "09:00", "Europe/Lisbon"), Date.UTC(2026, 6, 1, 8, 0));
  assert.equal(zonedToUtcMs("2026-01-15", "09:00", "Europe/Lisbon"), Date.UTC(2026, 0, 15, 9, 0));
  assert.equal(zonedToUtcMs("2026-07-01", "09:00", "Africa/Luanda"), Date.UTC(2026, 6, 1, 8, 0));
  assert.equal(zonedToUtcMs("2026-07-01", "09:00", "America/New_York"), Date.UTC(2026, 6, 1, 13, 0));
  assert.equal(zonedToUtcMs("2026-07-01", "09:00", "Asia/Kolkata"), Date.UTC(2026, 6, 1, 3, 30));
  // o dia da mudança de hora em Lisboa (29/03/2026: à 01:00 UTC os relógios avançam): 09:00 local já é verão
  assert.equal(zonedToUtcMs("2026-03-29", "09:00", "Europe/Lisbon"), Date.UTC(2026, 2, 29, 8, 0));
  assert.equal(zonedToUtcMs("2026-03-28", "09:00", "Europe/Lisbon"), Date.UTC(2026, 2, 28, 9, 0));
  // e no fim do verão (25/10/2026: voltam atrás): 09:00 local já é inverno
  assert.equal(zonedToUtcMs("2026-10-25", "09:00", "Europe/Lisbon"), Date.UTC(2026, 9, 25, 9, 0));
});

test("datas: validação, dia da semana e somas de dias", () => {
  assert.ok(isValidDateISO("2026-02-28") && !isValidDateISO("2026-02-30") && !isValidDateISO("2026-13-01") && !isValidDateISO("26-1-1") && !isValidDateISO("amanhã"));
  assert.equal(weekdayOf("2026-10-12"), "mon");
  assert.equal(weekdayOf("2026-10-11"), "sun");
  assert.equal(weekdayOf("2026-10-17"), "sat");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysISO("2026-03-01", -1), "2026-02-28");
});

test("config da agenda: períodos coerentes, sem sobreposição, valores em passos de 5", () => {
  assert.ok(scheduleConfigSchema.safeParse(DEFAULT_SCHEDULE_CONFIG).success);
  const withMon = (mon: unknown) => scheduleConfigSchema.safeParse({ ...DEFAULT_SCHEDULE_CONFIG, weekly: { ...DEFAULT_SCHEDULE_CONFIG.weekly, mon } }).success;
  assert.ok(withMon([{ start: "09:00", end: "12:00" }, { start: "12:00", end: "18:00" }]), "encostados é válido");
  assert.ok(!withMon([{ start: "09:00", end: "13:00" }, { start: "12:00", end: "18:00" }]), "sobrepostos");
  assert.ok(!withMon([{ start: "18:00", end: "09:00" }]), "fim antes do início");
  assert.ok(!withMon([{ start: "9:00", end: "12:00" }]), "formato");
  assert.ok(!withMon(Array.from({ length: 4 }, (_, i) => ({ start: `0${i + 1}:00`, end: `0${i + 1}:30` }))), "no máximo 3 períodos");
  const bad = (over: Partial<ScheduleConfig>) => scheduleConfigSchema.safeParse({ ...DEFAULT_SCHEDULE_CONFIG, ...over }).success;
  assert.ok(!bad({ slotMinutes: 7 }) && !bad({ slotMinutes: 10 }) && !bad({ slotMinutes: 300 }) && bad({ slotMinutes: 45 }));
  assert.ok(!bad({ bufferMinutes: 3 }) && bad({ bufferMinutes: 15 }) && !bad({ maxDaysAhead: 0 }) && !bad({ maxDaysAhead: 91 }) && !bad({ minNoticeHours: -1 }));
  assert.ok(!bad({ timezone: "Atlantis/Lost" }));
  assert.equal(parseScheduleConfig({}), null);
});

// "agora" = segunda-feira 2026-10-12 06:00 em Lisboa (05:00 UTC, verão)
const NOW = Date.UTC(2026, 9, 12, 5, 0);

test("horários livres: grelha dos períodos, antecedência mínima e dias fechados", () => {
  const slots = computeFreeSlots({ config: cfg({ minNoticeHours: 0 }), date: "2026-10-12", nowMs: NOW, busy: [] });
  assert.deepEqual(times(slots).slice(0, 3), ["09:00", "09:30", "10:00"]);
  assert.equal(times(slots).length, 16, "8 horas de 30 min");
  assert.ok(!times(slots).includes("13:00") && times(slots).includes("12:30") && times(slots).includes("14:00") && times(slots).includes("17:30") && !times(slots).includes("18:00"), "pausa de almoço e último início");
  // antecedência: às 06:00 com 4 h de aviso, o primeiro é 10:00
  assert.equal(computeFreeSlots({ config: cfg({ minNoticeHours: 4 }), date: "2026-10-12", nowMs: NOW, busy: [] })[0].time, "10:00");
  // fim de semana fechado, dia passado e acima do limite
  assert.deepEqual(computeFreeSlots({ config: cfg(), date: "2026-10-17", nowMs: NOW, busy: [] }), []);
  assert.deepEqual(computeFreeSlots({ config: cfg(), date: "2026-10-11", nowMs: NOW, busy: [] }), []);
  assert.deepEqual(computeFreeSlots({ config: cfg({ maxDaysAhead: 5 }), date: "2026-10-20", nowMs: NOW, busy: [] }), []);
  assert.ok(computeFreeSlots({ config: cfg({ maxDaysAhead: 8 }), date: "2026-10-20", nowMs: NOW, busy: [] }).length > 0);
  assert.deepEqual(computeFreeSlots({ config: { ...cfg(), enabled: false }, date: "2026-10-12", nowMs: NOW, busy: [] }), []);
  assert.deepEqual(computeFreeSlots({ config: cfg(), date: "lixo", nowMs: NOW, busy: [] }), []);
});

test("horários livres: marcações existentes e folga entre elas", () => {
  const at = (h: number, m = 0) => zonedToUtcMs("2026-10-12", `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, "Europe/Lisbon");
  const busy = [{ startMs: at(10), endMs: at(10, 30) }];
  const free = times(computeFreeSlots({ config: cfg({ minNoticeHours: 0 }), date: "2026-10-12", nowMs: NOW, busy }));
  assert.ok(!free.includes("10:00") && free.includes("09:30") && free.includes("10:30"));
  // com 15 min de folga, os vizinhos próximos também saem; a grelha passa a andar de 45 em 45 min
  const spaced = times(computeFreeSlots({ config: cfg({ minNoticeHours: 0, bufferMinutes: 15 }), date: "2026-10-12", nowMs: NOW, busy: [] }));
  assert.deepEqual(spaced.slice(0, 3), ["09:00", "09:45", "10:30"]);
  const spacedBusy = times(computeFreeSlots({ config: cfg({ minNoticeHours: 0, bufferMinutes: 15 }), date: "2026-10-12", nowMs: NOW, busy: [{ startMs: at(9, 45), endMs: at(10, 15) }] }));
  // marcação 09:45-10:15 com 15 min de folga: 09:45 está ocupado; 09:00 (acaba 09:30) e 10:30 (a folga acaba exatamente aí) ficam livres
  assert.ok(!spacedBusy.includes("09:45") && spacedBusy.includes("09:00") && spacedBusy.includes("10:30") && spacedBusy.includes("11:15"));
  // sem folga suficiente, o vizinho cai: com busy 09:45-10:15 e folga de 30, o 09:00 (acaba 09:30) já toca na folga
  const wide = times(computeFreeSlots({ config: cfg({ minNoticeHours: 0, bufferMinutes: 30 }), date: "2026-10-12", nowMs: NOW, busy: [{ startMs: at(9, 45), endMs: at(10, 15) }] }));
  assert.ok(!wide.includes("09:00") && !wide.includes("09:45"));
});

test("horários livres: o horário certo em cada fuso e no dia da mudança de hora", () => {
  const luanda = computeFreeSlots({ config: cfg({ timezone: "Africa/Luanda", minNoticeHours: 0 }), date: "2026-10-12", nowMs: NOW, busy: [] });
  assert.equal(luanda[0].startMs, Date.UTC(2026, 9, 12, 8, 0));
  const ny = computeFreeSlots({ config: cfg({ timezone: "America/New_York", minNoticeHours: 0 }), date: "2026-10-13", nowMs: NOW, busy: [] });
  assert.equal(ny[0].startMs, Date.UTC(2026, 9, 13, 13, 0));
  assert.equal(ny[0].time, "09:00");
  // 25/10/2026 (domingo) em Lisboa, dia em que os relógios recuam: configurar domingo aberto -> 09:00 local = 09:00Z
  const sunday = cfg({ minNoticeHours: 0, maxDaysAhead: 30, weekly: { ...DEFAULT_SCHEDULE_CONFIG.weekly, sun: [{ start: "09:00", end: "10:00" }] } });
  const dst = computeFreeSlots({ config: sunday, date: "2026-10-25", nowMs: NOW, busy: [] });
  assert.deepEqual(times(dst), ["09:00", "09:30"]);
  assert.equal(dst[0].startMs, Date.UTC(2026, 9, 25, 9, 0));
});

test("marcar: só um horário que a agenda oferece", () => {
  const c = cfg({ minNoticeHours: 0 });
  assert.ok(findSlot({ config: c, date: "2026-10-12", time: "09:30", nowMs: NOW, busy: [] }));
  for (const time of ["09:15", "13:00", "08:00", "18:00", "9:30", "25:00", "abc"]) {
    assert.equal(findSlot({ config: c, date: "2026-10-12", time, nowMs: NOW, busy: [] }), null, time);
  }
  const taken = [{ startMs: zonedToUtcMs("2026-10-12", "09:30", "Europe/Lisbon"), endMs: zonedToUtcMs("2026-10-12", "10:00", "Europe/Lisbon") }];
  assert.equal(findSlot({ config: c, date: "2026-10-12", time: "09:30", nowMs: NOW, busy: taken }), null, "já ocupado");
  const range = dayRangeMs("2026-10-12", "Europe/Lisbon", 15);
  assert.equal(range.fromMs, Date.UTC(2026, 9, 11, 23, 0) - 15 * MIN);
  assert.equal(range.toMs - range.fromMs, 24 * H + 30 * MIN);
});

test("valores: texto livre -> cêntimos, limites, formatação e item do catálogo", () => {
  const cases: [string | number, number | null][] = [
    ["29,90", 2990], ["29.90", 2990], ["29", 2900], ["1.299,90", 129990], ["1,299.90", 129990], ["1.299", 129900],
    ["1 299,5", 129950], ["€ 15", 1500], ["R$ 99,99", 9999], [12.5, 1250], ["0,50", 50], ["1000000", 100000000],
    ["0,49", null], ["0", null], ["-5", null], ["abc", null], ["", null], ["1000001", null], [NaN, null], [Infinity, null],
  ];
  for (const [input, expected] of cases) assert.equal(parseAmountToMinor(input), expected, String(input));
  assert.ok(/29,90/.test(formatMoney(2990, "EUR")) && formatMoney(2990, "EUR").includes("€"));
  const item = paymentItemInputSchema.parse({ name: "  Consulta  ", amount: "29,90", currency: "EUR" });
  assert.deepEqual(item, { name: "Consulta", amount: 2990, currency: "EUR" });
  for (const bad of [{ name: "", amount: "10", currency: "EUR" }, { name: "x", amount: "0,10", currency: "EUR" }, { name: "x", amount: "10", currency: "AOA" }, { name: "x", amount: "10", currency: "EUR", extra: 1 }]) {
    assert.equal(paymentItemInputSchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});
