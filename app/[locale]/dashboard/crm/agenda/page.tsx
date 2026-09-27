import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MiniCalendar } from "@/components/dashboard/crm/mini-calendar";
import { GoogleCalendarPanel } from "@/components/dashboard/crm/google-calendar-panel";

export default async function CrmAgendaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Agenda" subtitle="Consulte e agende reuniões e compromissos da equipa." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <MiniCalendar />
        <GoogleCalendarPanel />
      </div>
    </>
  );
}
