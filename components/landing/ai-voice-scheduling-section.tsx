import { useTranslations } from "next-intl";
import { CalendarCheck, Pause, Sparkles } from "lucide-react";
import { GoogleCalendarMark } from "@/components/icons/google-calendar-mark";

const WAVE_HEIGHTS = [30, 60, 40, 80, 55, 90, 45, 70, 35, 65, 50, 85, 40, 60, 30];

export function AiVoiceSchedulingSection() {
  const t = useTranslations("Landing.aiVoiceScheduling");

  return (
    <section id="section-ai-voice" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25">
          <Sparkles className="h-5 w-5 text-primary-2" />
        </span>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {t("voiceLabel")}
          </p>

          <div className="mt-5 flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500">
              <Pause className="h-4 w-4 text-background" fill="currentColor" />
            </span>

            <div className="flex h-10 flex-1 items-center gap-[3px]">
              {WAVE_HEIGHTS.map((height, index) => (
                <span
                  key={index}
                  style={{ height: `${height}%`, animationDelay: `${index * 0.06}s` }}
                  className="animate-waveform w-[3px] shrink-0 rounded-full bg-emerald-400/70"
                />
              ))}
            </div>

            <span className="shrink-0 text-xs text-white/40">{t("voiceDuration")}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-2">
              <GoogleCalendarMark className="h-full w-full" />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("calendarTitle")}</p>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-medium text-foreground">{t("calendarEvent")}</p>
            <p className="mt-1 text-xs text-white/40">{t("calendarTime")}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <CalendarCheck className="h-3.5 w-3.5" />
              {t("calendarConfirmed")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
