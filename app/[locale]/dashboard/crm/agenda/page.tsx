import { setRequestLocale } from "next-intl/server";
import { RefreshCw } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MiniCalendar } from "@/components/dashboard/crm/mini-calendar";
import { GoogleCalendarPanel } from "@/components/dashboard/crm/google-calendar-panel";
import { UpcomingAppointments } from "@/components/dashboard/crm/agenda-list/upcoming-appointments";

export default async function CrmAgendaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Agenda"
        subtitle="Consulte e agende reuniões e compromissos da equipa."
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar Google Calendar
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <MiniCalendar />
        <GoogleCalendarPanel />
      </div>

      <div className="mt-6">
        <UpcomingAppointments />
      </div>
    </>
  );
}
