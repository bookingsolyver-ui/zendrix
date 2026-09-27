import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { CreditCard, ShoppingBag, Smartphone, Store, Wallet } from "lucide-react";

type Integration = { name: string; icon: LucideIcon };

const INTEGRATIONS: Integration[] = [
  { name: "Shopify", icon: ShoppingBag },
  { name: "WooCommerce", icon: Store },
  { name: "Nuvemshop", icon: ShoppingBag },
  { name: "Stripe", icon: CreditCard },
  { name: "Multicaixa Express", icon: Smartphone },
  { name: "PayPal", icon: Wallet },
  { name: "Hotmart", icon: Store },
];

function Badge({ name, icon: Icon }: Integration) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-5 py-2.5">
      <Icon className="h-4 w-4 text-white/50" />
      <span className="text-sm font-medium text-white/70">{name}</span>
    </div>
  );
}

export function IntegrationsMarquee() {
  const t = useTranslations("Landing.integrations");
  const track = [...INTEGRATIONS, ...INTEGRATIONS];

  return (
    <section id="section-integrations" className="py-20 sm:py-24">
      <p className="text-center text-sm text-white/40">{t("label")}</p>

      <div className="relative mt-8 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent"
        />

        <div className="animate-marquee flex w-max gap-3">
          {track.map((integration, index) => (
            <Badge key={`${integration.name}-${index}`} {...integration} />
          ))}
        </div>
      </div>
    </section>
  );
}
