import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AppointmentsList } from "@/components/dashboard/settings/schedule/appointments-list";
import { ScheduleForm } from "@/components/dashboard/settings/schedule/schedule-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SCHEDULE_CONFIG, parseScheduleConfig } from "@/lib/schedule/config";
import { listUpcomingAppointments } from "@/lib/schedule/service";
import { formatSlotHuman } from "@/lib/schedule/slots";

export default async function SchedulePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const workspace = user?.workspace
    ? await prisma.workspace.findUnique({ where: { id: user.workspace.id }, select: { scheduleConfig: true } })
    : null;
  const config = parseScheduleConfig(workspace?.scheduleConfig) ?? DEFAULT_SCHEDULE_CONFIG;
  const upcoming = user?.workspace ? await listUpcomingAppointments(user.workspace.id) : [];

  return (
    <>
      <DashboardPageHeader title="Agenda" subtitle="A IA marca reuniões nos horários que definir aqui, e confirma-as na conversa." />
      <div className="space-y-6">
        {workspace && canManage ? (
          <ScheduleForm initial={config} />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">Apenas o proprietário e os gestores podem configurar a agenda.</p>
        )}
        <AppointmentsList
          canManage={canManage}
          appointments={upcoming.map((a) => ({
            id: a.id,
            customerName: a.customerName,
            customerEmail: a.customerEmail,
            service: a.service,
            when: formatSlotHuman(a.startsAt.getTime(), config.timezone),
          }))}
        />
      </div>
    </>
  );
}
