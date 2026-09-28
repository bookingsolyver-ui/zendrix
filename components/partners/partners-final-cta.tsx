import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function PartnersFinalCta() {
  const t = useTranslations("Partners.finalCta");

  return (
    <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] px-8 py-16 text-center sm:px-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(34,197,94,0.16),transparent_70%)]"
        />

        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">{t("subtitle")}</p>

          <Link
            href="/onboarding"
            className="neon-green-btn mt-9 inline-block rounded-full bg-green-500 px-9 py-4 text-sm font-semibold text-background hover:bg-green-400"
          >
            {t("button")}
          </Link>
        </div>
      </div>
    </section>
  );
}
