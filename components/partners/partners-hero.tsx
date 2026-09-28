import { useTranslations } from "next-intl";
import { Bell, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function PartnersHero() {
  const t = useTranslations("Partners.hero");

  return (
    <section className="relative overflow-hidden pt-40 sm:pt-48">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.18),transparent_70%)]"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {t("titleLine1")}
          <br />
          <span className="neon-green-white-text">{t("titleHighlight")}</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/50 text-balance">
          {t("subtitle")}
        </p>

        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/onboarding"
            className="neon-green-btn w-full rounded-full bg-green-500 px-8 py-4 text-sm font-semibold text-background hover:bg-green-400 sm:w-auto"
          >
            {t("ctaPrimary")}
          </Link>
          <a
            href="#como-funciona"
            className="w-full rounded-full border border-white/15 bg-background px-8 py-4 text-sm font-semibold text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.03] sm:w-auto"
          >
            {t("ctaSecondary")}
          </a>
        </div>

        <div className="relative mt-16 w-full max-w-sm sm:mt-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 -bottom-6 h-32 rounded-full bg-emerald-500/20 blur-3xl"
          />

          <div className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left shadow-2xl shadow-black/50 backdrop-blur-md">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Bell className="h-5 w-5 text-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/40">{t("notificationTitle")}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-lg font-semibold text-white">
                {t("notificationAmount")}
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
