import { useTranslations } from "next-intl";

const LOGOS = ["Meta", "WhatsApp", "Instagram", "Stripe", "Multicaixa", "Shopify", "WooCommerce"];

export function LogosMarquee() {
  const t = useTranslations("Landing");

  return (
    <section id="solutions" className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
      <p className="text-center text-sm text-white/40">{t("logosLabel")}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {LOGOS.map((logo) => (
          <span
            key={logo}
            className="text-lg font-semibold tracking-tight text-white/30 transition-colors hover:text-white/60 sm:text-xl"
          >
            {logo}
          </span>
        ))}
      </div>
    </section>
  );
}
