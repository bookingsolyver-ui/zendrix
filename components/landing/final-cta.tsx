import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function FinalCta() {
  const t = useTranslations("Landing");

  return (
    <section id="contact" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="glow-border relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-primary-2/15"
        />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            {t("finalCtaSubtitle")}
          </p>
          <Link
            href="/dashboard"
            className="neon-btn mt-8 inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-background"
          >
            {t("finalCtaButton")}
          </Link>
        </div>
      </div>
    </section>
  );
}
