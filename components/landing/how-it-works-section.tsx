import { useTranslations } from "next-intl";
import { Megaphone, Plug, Target } from "lucide-react";

const STEPS = [
  { key: "step1", icon: Plug },
  { key: "step2", icon: Megaphone },
  { key: "step3", icon: Target },
] as const;

export function HowItWorksSection() {
  const t = useTranslations("Landing.howItWorks");

  return (
    <section id="section-how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {STEPS.map(({ key, icon: Icon }, index) => (
          <li key={key} className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-7">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-sm font-semibold text-emerald-400">{index + 1}</span>
              <Icon className="h-5 w-5 text-white/30" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{t(`${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">{t(`${key}.text`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
