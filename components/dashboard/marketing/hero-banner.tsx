import type { LucideIcon } from "lucide-react";
import { Check, Plus } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

// Faixa de introdução de cada módulo de marketing: o que faz, três vantagens e a ação principal.
export function MarketingHero({
  icon: Icon,
  title,
  description,
  bullets,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
}) {
  return (
    <section className="glow-border flex flex-col gap-6 rounded-2xl p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2">
          <Icon className="h-6 w-6 text-neon-green" />
        </span>
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
          <ul className="mt-4 space-y-2">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/80">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SoonButton
        feature={cta}
        className="neon-btn flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background"
      >
        <Plus className="h-4 w-4" />
        {cta}
      </SoonButton>
    </section>
  );
}
