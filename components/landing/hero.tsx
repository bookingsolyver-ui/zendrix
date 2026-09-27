import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";

export function Hero() {
  const t = useTranslations("Landing");

  return (
    <section className="relative overflow-hidden pt-40 sm:pt-48">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        <h1 className="text-6xl font-extrabold leading-[0.95] tracking-tight text-balance sm:text-7xl md:text-8xl">
          {t("titleLine1")}
          <br />
          <span className="neon-green-white-text">{t("titleHighlight")}</span>.
        </h1>

        <p className="mt-8 max-w-2xl text-lg leading-8 text-white/50 text-balance sm:text-xl">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/onboarding"
            className="neon-green-btn w-full rounded-full bg-green-500 px-8 py-4 text-sm font-semibold text-background hover:bg-green-400 sm:w-auto"
          >
            {t("ctaPrimary")}
          </Link>
          <button
            type="button"
            className="w-full rounded-full border border-white/15 bg-background px-8 py-4 text-sm font-semibold text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.03] sm:w-auto"
          >
            {t("ctaSecondary")}
          </button>
        </div>
      </div>

      <DashboardMockup />
    </section>
  );
}
