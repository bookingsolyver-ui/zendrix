import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Pill, Section, dateTime } from "@/components/admin/ui";
import { loadCalendarOrgs } from "@/lib/admin/queries";
import { CALENDAR_KIND_LABEL, calendarEvents, dayKey, groupByDay, monthBounds, monthGrid, parseMonth, shiftMonth, type CalendarKind } from "@/lib/admin/calendar";

const KIND_STYLE: Record<CalendarKind, string> = { trial_end: "bg-amber-400/15 text-amber-300", renewal: "bg-emerald-500/15 text-emerald-300", expiry: "bg-red-500/15 text-red-300" };
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const nowDate = () => new Date();

export default async function AdminCalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ month?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const now = nowDate();
  const month = parseMonth((await searchParams).month, now);
  const { from, to } = monthBounds(month);
  const { orgs, pastDue } = await loadCalendarOrgs(from, to);
  const events = calendarEvents(orgs).filter((event) => dayKey(event.date).startsWith(month));
  const byDay = groupByDay(events);
  const grid = monthGrid(month);
  const [year, m] = month.split("-").map(Number);
  const today = dayKey(now);
  const counts = { trial_end: 0, renewal: 0, expiry: 0 };
  for (const event of events) counts[event.kind]++;

  return (
    <>
      <DashboardPageHeader title="Calendário de subscrições" subtitle="Fins de teste, renovações e expirações, por dia." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?month=${shiftMonth(month, -1)}`} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30" aria-label="Mês anterior">
            ←
          </Link>
          <h2 className="min-w-[10rem] text-center text-base font-semibold capitalize text-white">
            {MONTHS[m - 1]} de {year}
          </h2>
          <Link href={`/admin/calendar?month=${shiftMonth(month, 1)}`} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30" aria-label="Mês seguinte">
            →
          </Link>
          <Link href="/admin/calendar" className="ml-2 text-sm text-white/50 hover:text-white">
            Hoje
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(counts) as CalendarKind[]).map((kind) => (
            <span key={kind} className={`rounded-full px-2.5 py-1 font-medium ${KIND_STYLE[kind]}`}>
              {CALENDAR_KIND_LABEL[kind].split(" (")[0]}: {counts[kind]}
            </span>
          ))}
        </div>
      </div>

      <div className="glow-border overflow-x-auto rounded-2xl">
        <div className="grid min-w-[760px] grid-cols-7 border-b border-white/10 text-center text-xs font-medium text-white/40">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2">
              {day}
            </div>
          ))}
        </div>
        {grid.map((week, index) => (
          <div key={index} className="grid min-w-[760px] grid-cols-7 border-b border-white/5 last:border-b-0">
            {week.map((cell) => {
              const list = byDay.get(cell.key) ?? [];
              return (
                <div key={cell.key} className={`min-h-[96px] border-r border-white/5 p-1.5 last:border-r-0 ${cell.inMonth ? "" : "opacity-30"} ${cell.key === today ? "bg-emerald-500/5" : ""}`}>
                  <p className={`text-xs ${cell.key === today ? "font-semibold text-emerald-400" : "text-white/40"}`}>{cell.day}</p>
                  <div className="mt-1 space-y-1">
                    {list.slice(0, 3).map((event) => (
                      <Link key={`${event.orgId}-${event.kind}`} href={`/admin/organizations/${event.orgId}`} title={`${CALENDAR_KIND_LABEL[event.kind]}: ${event.orgName}`} className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLE[event.kind]}`}>
                        {event.orgName}
                      </Link>
                    ))}
                    {list.length > 3 && <p className="px-1 text-[10px] text-white/40">+{list.length - 3} mais</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Section title={`Datas deste mês (${events.length})`}>
        <ul className="glow-border divide-y divide-white/5 rounded-2xl text-sm">
          {events.map((event) => (
            <li key={`${event.orgId}-${event.kind}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span>
                <Link href={`/admin/organizations/${event.orgId}`} className="font-medium text-white hover:underline">
                  {event.orgName}
                </Link>
              </span>
              <span className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${KIND_STYLE[event.kind]}`}>{CALENDAR_KIND_LABEL[event.kind]}</span>
                <span className="text-xs text-white/40">{dateTime.format(event.date)}</span>
              </span>
            </li>
          ))}
          {events.length === 0 && <li className="px-5 py-8 text-center text-white/40">Nenhuma data crítica neste mês.</li>}
        </ul>
        <p className="mt-3 text-xs text-white/40">As datas de renovação vêm dos eventos do Stripe. Organizações antigas só aparecem depois do próximo evento, ou ao usar «Sincronizar com o Stripe» no detalhe da organização.</p>
      </Section>

      <Section title={`Em atraso (${pastDue.length})`}>
        <ul className="glow-border divide-y divide-white/5 rounded-2xl text-sm">
          {pastDue.map((org) => (
            <li key={org.id} className="flex items-center justify-between gap-2 px-5 py-3">
              <Link href={`/admin/organizations/${org.id}`} className="font-medium text-white hover:underline">
                {org.name}
              </Link>
              <span className="flex items-center gap-3">
                <span className="text-xs text-white/40">{org.ownerEmail ?? ""}</span>
                <Pill tone="warn">Pagamento em atraso</Pill>
              </span>
            </li>
          ))}
          {pastDue.length === 0 && <li className="px-5 py-6 text-center text-white/40">Nenhuma organização em atraso.</li>}
        </ul>
      </Section>
    </>
  );
}
