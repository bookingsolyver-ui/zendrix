import { Calendar, Video } from "lucide-react";

type Appointment = {
  id: string;
  title: string;
  time: string;
  meetLink: boolean;
};

// There is no appointments table yet, so the list is empty.
const APPOINTMENTS: Appointment[] = [];

export function UpcomingAppointments() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Calendar className="h-4 w-4 text-emerald-400" />
        Próximos Compromissos
      </h2>

      {APPOINTMENTS.length === 0 && (
        <p className="mt-5 rounded-xl border border-white/5 bg-black/20 px-4 py-8 text-center text-sm text-white/40">
          Não tem compromissos agendados.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {APPOINTMENTS.map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{appointment.title}</p>
              <p className="mt-1 text-xs text-white/40">{appointment.time}</p>
            </div>

            {appointment.meetLink && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-2">
                <Video className="h-3.5 w-3.5" />
                Link do Meet
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
