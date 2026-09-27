import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Hero() {
  const t = useTranslations("Landing");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-6rem] top-40 h-[24rem] w-[24rem] rounded-full bg-primary-2/20 blur-[100px]"
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
        <span className="glow-border rounded-full px-4 py-1.5 text-xs font-medium tracking-wide text-muted">
          {t("eyebrow")}
        </span>

        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">
          {t("titleLine1")}
          <br />
          <span className="neon-text">{t("titleLine2")}</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted text-balance">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="neon-btn w-full rounded-full px-7 py-3.5 text-sm font-semibold text-background sm:w-auto"
          >
            {t("ctaPrimary")}
          </Link>
          <a
            href="#contact"
            className="glow-border w-full rounded-full px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary sm:w-auto"
          >
            {t("ctaSecondary")}
          </a>
        </div>

        <p className="mt-8 text-xs uppercase tracking-widest text-muted">
          {t("trustLabel")}
        </p>
      </div>
    </section>
  );
}
