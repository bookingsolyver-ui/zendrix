import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";

// Um único plano, com tudo incluído. O valor só se mostra se estiver definido em NEXT_PUBLIC_PLAN_PRICE_LABEL
// (texto livre, ex.: "29 € / mês"): um preço escrito aqui à mão podia divergir do que o Stripe cobra. Sem ele,
// diz-se a verdade: o preço aparece antes de subscrever.
export function PricingSection() {
  const t = useTranslations("Landing.pricing");
  const features = t.raw("features") as string[];
  const priceLabel = process.env.NEXT_PUBLIC_PLAN_PRICE_LABEL?.trim();

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
          {t("trialBadge")}
        </span>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mx-auto mt-12 max-w-md">
        <div className="pricing-pro-glow flex flex-col rounded-3xl border-2 bg-white/[0.03] p-7 sm:p-8">
          <h3 className="text-base font-semibold text-foreground">{t("planName")}</h3>
          <p className="mt-1.5 text-sm text-white/50">{t("planDescription")}</p>

          <p className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
            {priceLabel || t("priceAtCheckout")}
          </p>

          <ul className="mt-7 flex-1 space-y-2.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-white/60">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="neon-green-btn mt-7 w-full rounded-full bg-green-500 px-5 py-2.5 text-center text-sm font-semibold text-background transition-colors hover:bg-green-400"
          >
            {t("cta")}
          </Link>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-white/40">{t("trialNote")}</p>
    </section>
  );
}
