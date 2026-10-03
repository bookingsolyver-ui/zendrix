"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT, TIMEZONES } from "@/components/dashboard/settings/ui";
import { WEEKDAYS, WEEKDAY_LABEL, type ScheduleConfig, type Weekday } from "@/lib/schedule/config";

type Weekly = ScheduleConfig["weekly"];

const ISSUE_TEXT: Record<string, string> = {
  overlap: "Há períodos sobrepostos no mesmo dia.",
  end_before_start: "Um período acaba antes de começar.",
  multiple_of_5: "A duração e a folga têm de ser múltiplos de 5 minutos.",
  invalid_timezone: "Fuso horário inválido.",
};

export function ScheduleForm({ initial }: { initial: ScheduleConfig }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [slotMinutes, setSlotMinutes] = useState(initial.slotMinutes);
  const [bufferMinutes, setBufferMinutes] = useState(initial.bufferMinutes);
  const [minNoticeHours, setMinNoticeHours] = useState(initial.minNoticeHours);
  const [maxDaysAhead, setMaxDaysAhead] = useState(initial.maxDaysAhead);
  const [weekly, setWeekly] = useState<Weekly>(initial.weekly);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setDay = (day: Weekday, intervals: Weekly[Weekday]) => setWeekly({ ...weekly, [day]: intervals });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, timezone, slotMinutes, bufferMinutes, minNoticeHours, maxDaysAhead, weekly }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const message = data?.issues?.map((i: { message: string }) => ISSUE_TEXT[i.message]).find(Boolean);
        setError(message ?? "Configuração inválida. Verifique os horários e os valores.");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  const number = (value: number, set: (n: number) => void, label: string, min: number, max: number, step = 1) => (
    <input type="number" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} aria-label={label} className={`${INPUT} w-24`} />
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className={CARD}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" />
          <span>
            <span className="block text-sm font-semibold text-white">Marcações pela IA</span>
            <span className="mt-1 block text-sm text-white/50">
              A IA vê os horários livres, propõe-os ao cliente e confirma a marcação na conversa. Só marca o que a agenda oferece e nunca duas marcações na mesma hora.
            </span>
          </span>
        </label>
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-white">Regras</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-white/60">
            Fuso horário
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={`${INPUT} mt-1.5 block w-full bg-[#111]`}>
              {[...new Set([timezone, ...TIMEZONES])].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-3 text-sm text-white/60">
            <p className="flex items-center gap-3">{number(slotMinutes, setSlotMinutes, "Duração", 15, 240, 5)} minutos por marcação</p>
            <p className="flex items-center gap-3">{number(bufferMinutes, setBufferMinutes, "Folga", 0, 120, 5)} minutos de folga entre marcações</p>
            <p className="flex items-center gap-3">{number(minNoticeHours, setMinNoticeHours, "Antecedência", 0, 168)} horas de antecedência mínima</p>
            <p className="flex items-center gap-3">{number(maxDaysAhead, setMaxDaysAhead, "Dias", 1, 90)} dias de antecedência máxima</p>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-white">Horário de atendimento</h2>
        <p className="mt-1 text-sm text-white/50">Os períodos em que se pode marcar. Um dia sem períodos fica fechado.</p>
        <div className="mt-4 divide-y divide-white/5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-20 text-sm text-white/70">{WEEKDAY_LABEL[day]}</span>
              {weekly[day].length === 0 && <span className="text-sm text-white/30">Fechado</span>}
              {weekly[day].map((interval, index) => (
                <span key={index} className="flex items-center gap-1.5">
                  <input type="time" value={interval.start} onChange={(e) => setDay(day, weekly[day].map((x, i) => (i === index ? { ...x, start: e.target.value } : x)))} className={INPUT} aria-label={`${WEEKDAY_LABEL[day]}: início`} />
                  <span className="text-white/40">–</span>
                  <input type="time" value={interval.end} onChange={(e) => setDay(day, weekly[day].map((x, i) => (i === index ? { ...x, end: e.target.value } : x)))} className={INPUT} aria-label={`${WEEKDAY_LABEL[day]}: fim`} />
                  <button type="button" onClick={() => setDay(day, weekly[day].filter((_, i) => i !== index))} aria-label="Remover período" className="text-white/40 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              ))}
              {weekly[day].length < 3 && (
                <button type="button" onClick={() => setDay(day, [...weekly[day], { start: "09:00", end: "18:00" }])} className={`${BTN_GHOST} inline-flex items-center gap-1 px-3 py-1.5 text-xs`}>
                  <Plus className="h-3.5 w-3.5" />
                  Período
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
        {saved && <span role="status" className="text-sm text-emerald-300">Guardado.</span>}
      </div>
    </form>
  );
}
