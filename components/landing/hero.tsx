import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PhoneMockup } from "@/components/landing/phone-mockup";

export function Hero() {
  const t = useTranslations("Landing.hero");

  return (
    <section id="section-hero" className="relative overflow-hidden pt-16 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}{" "}
            <span className="neon-green-white-text">{t("titleHighlight")}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-8 text-white/50 text-balance lg:mx-0">
            {t("subtitle")}
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
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

        <PhoneMockup />
      </div>
    </section>
  );
}
