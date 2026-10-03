// O calendário de subscrições do painel de administração. Puro (sem servidor): decide que datas são "críticas" e
// como se distribuem por um mês. Os dias contam-se no fuso de Lisboa (o da equipa de suporte).

export type CalendarKind = "trial_end" | "renewal" | "expiry";

export const CALENDAR_KIND_LABEL: Record<CalendarKind, string> = {
  trial_end: "Fim do teste",
  renewal: "Renovação",
  expiry: "Expira (cancelada no fim do período)",
};

export interface CalendarOrg {
  id: string;
  name: string;
  subStatus: string;
  trialEndsAt: Date | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  blocked: boolean;
}

export interface CalendarEvent {
  date: Date;
  kind: CalendarKind;
  orgId: string;
  orgName: string;
}

// Cada organização gera, no máximo, UMA data crítica:
//  * em teste, com data de fim            -> fim do teste;
//  * ativa/em teste e marcada para cancelar no fim do período (com data) -> expira nesse dia;
//  * ativa, com data de renovação          -> renovação.
// Em atraso e canceladas não têm data futura: aparecem noutra lista (não são eventos de calendário).
export function calendarEvents(orgs: CalendarOrg[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const org of orgs) {
    if (org.cancelAtPeriodEnd && org.periodEnd && (org.subStatus === "active" || org.subStatus === "trialing")) {
      events.push({ date: org.periodEnd, kind: "expiry", orgId: org.id, orgName: org.name });
    } else if (org.subStatus === "trialing" && org.trialEndsAt) {
      events.push({ date: org.trialEndsAt, kind: "trial_end", orgId: org.id, orgName: org.name });
    } else if (org.subStatus === "active" && org.periodEnd) {
      events.push({ date: org.periodEnd, kind: "renewal", orgId: org.id, orgName: org.name });
    }
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const dayFormat = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Lisbon" });
// "2026-10-03": o dia do calendário de Lisboa a que um instante pertence.
export const dayKey = (date: Date) => dayFormat.format(date);

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// "2026-10" válido, ou o mês de `now` (parâmetros do URL nunca rebentam nada).
export function parseMonth(value: string | undefined, now = new Date()): string {
  return value && MONTH_RE.test(value) && Number(value.slice(0, 4)) >= 2020 && Number(value.slice(0, 4)) <= 2100 ? value : dayKey(now).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

// Os limites do mês, com margem de um dia para cada lado (os fusos horários não deixam eventos de fora).
export function monthBounds(month: string): { from: Date; to: Date } {
  const [year, m] = month.split("-").map(Number);
  return { from: new Date(Date.UTC(year, m - 1, 1) - 86_400_000), to: new Date(Date.UTC(year, m, 1) + 86_400_000) };
}

export interface GridDay {
  key: string; // "2026-10-03"
  day: number;
  inMonth: boolean;
}

// As semanas do mês, de segunda a domingo, com os dias de fora do mês a preencher as pontas.
export function monthGrid(month: string): GridDay[][] {
  const [year, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // segunda = 0
  const start = new Date(Date.UTC(year, m - 1, 1 - offset));
  const weeks: GridDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: GridDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      week.push({ key, day: date.getUTCDate(), inMonth: key.startsWith(month) });
    }
    if (w >= 4 && week.every((cell) => !cell.inMonth)) break;
    weeks.push(week);
  }
  return weeks;
}

export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKey(event.date);
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  return map;
}
