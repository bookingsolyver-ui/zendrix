import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { MONTHLY_PRICES, PLANS, formatPrice } from "@/components/dashboard/billing/pricing-data";

export function PricingSection() {
  const t = useTranslations("Landing.pricing");

  const ctaByPlan: Record<string, string> = {
    basic: t("ctaBasic"),
    pro: t("ctaPro"),
    enterprise: t("ctaEnterprise"),
  };

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const brl = formatPrice(MONTHLY_PRICES[plan.id].BRL, "BRL");
          const aoa = formatPrice(MONTHLY_PRICES[plan.id].AOA, "AOA");
          const description = t(`plans.${plan.id}.description`);
          const features = t.raw(`plans.${plan.id}.features`) as string[];

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl p-7 sm:p-8 ${
                plan.highlight
                  ? "border-2 border-emerald-500 bg-white/[0.03] ring-2 ring-emerald-500/40 lg:-translate-y-2"
                  : "border border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-background">
                  {t("proBadge")}
                </span>
              )}

              <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1.5 text-sm text-white/50">{description}</p>

              <div className="mt-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    {brl}
                  </span>
                  <span className="text-sm text-white/40">{t("perMonth")}</span>
                </div>
                <p className="mt-1 text-xs text-white/40">{aoa} / mês</p>
              </div>

              <ul className="mt-7 flex-1 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-white/60">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`mt-7 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "neon-green-btn bg-green-500 text-background hover:bg-green-400"
                    : "border border-white/15 text-foreground hover:border-white/30 hover:bg-white/[0.03]"
                }`}
              >
                {ctaByPlan[plan.id]}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
