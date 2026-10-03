import { setRequestLocale } from "next-intl/server";
import { Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AppointmentsList } from "@/components/dashboard/settings/schedule/appointments-list";
import { BTN_GHOST } from "@/components/dashboard/settings/ui";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SCHEDULE_CONFIG, parseScheduleConfig } from "@/lib/schedule/config";
import { listUpcomingAppointments } from "@/lib/schedule/service";
import { formatSlotHuman } from "@/lib/schedule/slots";

// A agenda do CRM mostra as marcações reais (as que a IA faz na conversa e as que forem criadas). Os horários
// disponíveis definem-se em Definições > Agenda.
export default async function CrmAgendaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const workspace = user?.workspace ? await prisma.workspace.findUnique({ where: { id: user.workspace.id }, select: { scheduleConfig: true } }) : null;
  const config = parseScheduleConfig(workspace?.scheduleConfig) ?? DEFAULT_SCHEDULE_CONFIG;
  const upcoming = user?.workspace ? await listUpcomingAppointments(user.workspace.id) : [];

  return (
    <>
      <DashboardPageHeader
        title="Agenda"
        subtitle="As marcações confirmadas, ordenadas por data."
        action={
          canManage ? (
            <Link href="/dashboard/settings/schedule" className={`${BTN_GHOST} flex items-center gap-2`}>
              <Settings2 className="h-4 w-4" />
              Definir horários
            </Link>
          ) : undefined
        }
      />
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
    </>
  );
}
