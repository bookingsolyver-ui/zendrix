// Disponibilidade da agenda: o cálculo de horários livres. Puro (sem servidor) e testado com fusos e horário de
// verão, que é onde estas contas costumam falhar. Tudo o que é "hora local" refere-se ao fuso da organização;
// tudo o que é instante (`...Ms`) é UTC em milissegundos.
import { WEEKDAYS, type ScheduleConfig, type Weekday } from "./config.ts";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

// Deslocamento do fuso em minutos nesse instante (ex.: Lisboa no verão = +60).
export function tzOffsetMinutes(utcMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(new Date(utcMs));
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
  if (!match) return 0; // "GMT" = UTC
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

// "AAAA-MM-DD" + "HH:MM" na hora local do fuso -> instante UTC. Faz uma segunda passagem para acertar quando o
// deslocamento muda nesse dia (mudança de hora).
export function zonedToUtcMs(dateISO: string, time: string, timezone: string): number {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - tzOffsetMinutes(guess, timezone) * MIN;
  const second = guess - tzOffsetMinutes(first, timezone) * MIN;
  return second;
}

export const isValidDateISO = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const weekdayOf = (dateISO: string): Weekday => {
  const [y, m, d] = dateISO.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return WEEKDAYS[(day + 6) % 7];
};

// A data de hoje no fuso (AAAA-MM-DD).
export const todayISO = (nowMs: number, timezone: string): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(nowMs));

export const addDaysISO = (dateISO: string, days: number): string => {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY).toISOString().slice(0, 10);
};

export const timeOf = (startMs: number, timezone: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(startMs));

export interface Busy {
  startMs: number;
  endMs: number;
}
export interface Slot {
  time: string; // "HH:MM", hora local
  startMs: number;
}

// Os horários livres de um dia: dentro dos períodos de funcionamento, com a duração e a folga configuradas,
// depois da antecedência mínima, até ao limite de dias, e sem tocar em nenhuma marcação existente (nem na sua folga).
export function computeFreeSlots(input: { config: ScheduleConfig; date: string; nowMs: number; busy: Busy[] }): Slot[] {
  const { config, date, nowMs, busy } = input;
  if (!config.enabled || !isValidDateISO(date)) return [];

  const today = todayISO(nowMs, config.timezone);
  if (date < today || date > addDaysISO(today, config.maxDaysAhead)) return [];

  const slotMs = config.slotMinutes * MIN;
  const bufferMs = config.bufferMinutes * MIN;
  const earliest = nowMs + config.minNoticeHours * 60 * MIN;
  const slots: Slot[] = [];

  for (const interval of config.weekly[weekdayOf(date)]) {
    const start = zonedToUtcMs(date, interval.start, config.timezone);
    const end = zonedToUtcMs(date, interval.end, config.timezone);
    for (let t = start; t + slotMs <= end; t += slotMs + bufferMs) {
      if (t < earliest) continue;
      const clashes = busy.some((b) => t < b.endMs + bufferMs && t + slotMs > b.startMs - bufferMs);
      if (!clashes) slots.push({ time: timeOf(t, config.timezone), startMs: t });
    }
  }
  return slots.sort((a, b) => a.startMs - b.startMs);
}

// O instante de início se `time` é MESMO um horário livre desse dia (a IA só pode marcar o que a agenda oferece),
// senão null.
export function findSlot(input: { config: ScheduleConfig; date: string; time: string; nowMs: number; busy: Busy[] }): Slot | null {
  return computeFreeSlots(input).find((slot) => slot.time === input.time) ?? null;
}

// O intervalo de instantes a consultar na base de dados para as marcações que podem afetar um dia.
export const dayRangeMs = (dateISO: string, timezone: string, bufferMinutes: number): { fromMs: number; toMs: number } => ({
  fromMs: zonedToUtcMs(dateISO, "00:00", timezone) - bufferMinutes * MIN,
  toMs: zonedToUtcMs(addDaysISO(dateISO, 1), "00:00", timezone) + bufferMinutes * MIN,
});

export function formatSlotHuman(startMs: number, timezone: string, locale = "pt-PT"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: timezone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(startMs));
}
