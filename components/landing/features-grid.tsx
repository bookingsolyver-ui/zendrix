import { useTranslations } from "next-intl";
import { Bot, Send, ShieldCheck, Users } from "lucide-react";

const FEATURES = [
  { key: "team", icon: Users },
  { key: "ai", icon: Bot },
  { key: "queue", icon: Send },
  { key: "security", icon: ShieldCheck },
] as const;

export function FeaturesGrid() {
  const t = useTranslations("Landing.features");

  return (
    <section id="section-features" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {FEATURES.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 transition-colors hover:border-emerald-500/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Icon className="h-5 w-5 text-emerald-400" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{t(`items.${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">{t(`items.${key}.text`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
