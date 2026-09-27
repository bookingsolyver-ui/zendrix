import { Sparkles } from "lucide-react";
import { GoogleCalendarMark } from "@/components/icons/google-calendar-mark";

export function GoogleCalendarPanel() {
  return (
    <div className="glow-border relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl p-10 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-2/10"
      />

      <div className="relative flex flex-col items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 p-3">
          <GoogleCalendarMark className="h-full w-full" />
        </span>

        <h2 className="mt-6 text-lg font-semibold tracking-tight">Google Calendar</h2>

        <p className="mt-3 flex max-w-xs items-start gap-2 text-left text-sm text-muted">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
          A IA da Zentrix pode agendar reuniões automaticamente com os seus contactos,
          respeitando a sua disponibilidade real e evitando conflitos de horário.
        </p>

        <button
          type="button"
          className="neon-btn mt-7 rounded-full px-6 py-3 text-sm font-semibold text-background"
        >
          Conectar Google Agenda
        </button>
      </div>
    </div>
  );
}
