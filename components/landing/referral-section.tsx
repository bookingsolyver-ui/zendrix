import { useTranslations } from "next-intl";
import { Percent, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function ReferralSection() {
  const t = useTranslations("Landing.referral");

  return (
    <section id="section-refer-and-earn" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] px-8 py-14 sm:px-14 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_0%_0%,rgba(34,197,94,0.14),transparent_70%)]"
        />

        <div className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25">
              <Percent className="h-6 w-6 text-emerald-400" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
              </h2>
              <p className="mx-auto mt-2 max-w-md text-white/50 lg:mx-0">{t("subtitle")}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-4">
            <Link
              href="/parceiros"
              className="neon-green-btn rounded-full bg-green-500 px-8 py-4 text-sm font-semibold text-background hover:bg-green-400"
            >
              {t("cta")}
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-white/30">
              <Users className="h-3.5 w-3.5" />
              {t("partnersNote")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
