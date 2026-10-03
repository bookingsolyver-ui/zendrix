import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FinalCtaSection() {
  const t = useTranslations("Landing.finalCta");

  return (
    <section id="section-cta" className="relative overflow-hidden border-t border-white/5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(34,197,94,0.14),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-white/50">{t("subtitle")}</p>

        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="neon-green-btn w-full rounded-full bg-green-500 px-8 py-4 text-sm font-semibold text-background hover:bg-green-400 sm:w-auto"
          >
            {t("ctaPrimary")}
          </Link>
          <a
            href="#pricing"
            className="w-full rounded-full border border-white/15 bg-background px-8 py-4 text-sm font-semibold text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.03] sm:w-auto"
          >
            {t("ctaSecondary")}
          </a>
        </div>
        <p className="mt-6 text-sm text-white/40">
          <Link href="/login" className="underline-offset-4 transition-colors hover:text-white hover:underline">
            {t("login")}
          </Link>
        </p>
      </div>
    </section>
  );
}
