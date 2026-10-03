// Configuração da agenda de uma organização. Puro (sem servidor).
import { z } from "zod";
import { isValidTimezone } from "../followups/config.ts";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

// Os períodos de um dia (ex.: 09:00-13:00 e 14:00-18:00): cada um com início antes do fim, sem se sobreporem.
const dayIntervals = z
  .array(z.object({ start: hhmm, end: hhmm }).refine((i) => toMinutes(i.start) < toMinutes(i.end), "end_before_start"))
  .max(3)
  .refine((intervals) => {
    const sorted = [...intervals].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    return sorted.every((interval, index) => index === 0 || toMinutes(sorted[index - 1].end) <= toMinutes(interval.start));
  }, "overlap");

export const scheduleConfigSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().refine(isValidTimezone, "invalid_timezone"),
  slotMinutes: z.number().int().min(15).max(240).refine((v) => v % 5 === 0, "multiple_of_5"),
  // Folga depois de cada marcação (deslocação, preparação).
  bufferMinutes: z.number().int().min(0).max(120).refine((v) => v % 5 === 0, "multiple_of_5"),
  // Antecedência mínima: não se marca para daqui a 10 minutos.
  minNoticeHours: z.number().int().min(0).max(168),
  maxDaysAhead: z.number().int().min(1).max(90),
  weekly: z.object({
    mon: dayIntervals,
    tue: dayIntervals,
    wed: dayIntervals,
    thu: dayIntervals,
    fri: dayIntervals,
    sat: dayIntervals,
    sun: dayIntervals,
  }),
});

export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>;

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  enabled: false,
  timezone: "Europe/Lisbon",
  slotMinutes: 30,
  bufferMinutes: 0,
  minNoticeHours: 2,
  maxDaysAhead: 30,
  weekly: {
    mon: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
    tue: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
    wed: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
    thu: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
    fri: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }],
    sat: [],
    sun: [],
  },
};

export function parseScheduleConfig(raw: unknown): ScheduleConfig | null {
  const parsed = scheduleConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
