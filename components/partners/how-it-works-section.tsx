import { useTranslations } from "next-intl";
import { Link2, Share2, Wallet } from "lucide-react";

export function HowItWorksSection() {
  const t = useTranslations("Partners.howItWorks");

  const steps = [
    { icon: Link2, title: t("step1Title"), description: t("step1Description") },
    { icon: Share2, title: t("step2Title"), description: t("step2Description") },
    { icon: Wallet, title: t("step3Title"), description: t("step3Description") },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {index + 1}
                </span>
                <Icon className="h-5 w-5 text-white/30" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
