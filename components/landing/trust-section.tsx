import { useTranslations } from "next-intl";
import { Database, FileCheck2, KeyRound, ShieldCheck } from "lucide-react";

const ITEMS = [
  { key: "isolation", icon: Database },
  { key: "secrets", icon: KeyRound },
  { key: "meta", icon: ShieldCheck },
  { key: "privacy", icon: FileCheck2 },
] as const;

export function TrustSection() {
  const t = useTranslations("Landing.trust");

  return (
    <section id="section-trust" className="relative border-y border-white/5 bg-white/[0.015]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
          </h2>
          <p className="mt-4 text-white/50">{t("subtitle")}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-3xl border border-white/10 bg-black/20 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Icon className="h-5 w-5 text-emerald-400" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-white/50">{t(`items.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
