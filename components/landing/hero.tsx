import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";

export function Hero() {
  const t = useTranslations("Landing.hero");

  return (
    <section id="section-hero" className="relative overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">
            {t("title")} <span className="neon-green-white-text">{t("titleHighlight")}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/55 text-balance">{t("subtitle")}</p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="neon-green-btn flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-8 py-4 text-sm font-semibold text-background hover:bg-green-400 sm:w-auto"
            >
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#section-features"
              className="w-full rounded-full border border-white/15 bg-background px-8 py-4 text-sm font-semibold text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.03] sm:w-auto"
            >
              {t("ctaSecondary")}
            </a>
          </div>
          <p className="mt-5 text-xs text-white/40">{t("note")}</p>
        </div>

        <div className="mt-14 sm:mt-20">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
