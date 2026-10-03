import type { LucideIcon } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export type StarterOption = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Atalhos "comece por..." — cada cartão abre o editor já configurado (quando o módulo for lançado).
export function StarterGrid({
  title,
  subtitle,
  options,
  columns = "lg:grid-cols-4",
}: {
  title: string;
  subtitle: string;
  options: StarterOption[];
  columns?: string;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      <div className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 ${columns}`}>
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <SoonButton
              key={option.title}
              feature={option.title}
              className="glow-border flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-colors hover:border-primary"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="h-5 w-5 text-neon-green" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{option.description}</span>
              </span>
            </SoonButton>
          );
        })}
      </div>
    </section>
  );
}
