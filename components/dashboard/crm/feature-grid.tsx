import type { LucideIcon } from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Vantagens do módulo, só informativas (sem cliques). Usado apenas em Server Components, por isso os ícones
// podem viajar como componentes; num Client Component teriam de ir como nome em texto.
export function FeatureGrid({ title, features }: { title: string; features: Feature[] }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article key={feature.title} className="glow-border rounded-2xl p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="h-5 w-5 text-neon-green" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{feature.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
