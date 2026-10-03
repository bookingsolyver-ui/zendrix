"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export type GalleryModel = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  category: string;
  meta?: string;
  // Pré-visualização da mensagem, tal como o cliente a vê.
  preview?: string;
};

// Galeria de modelos prontos com separadores por categoria (e contagem). Usada em Automações, Popups e Templates.
export function ModelGallery({
  title,
  subtitle,
  models,
  action,
}: {
  title: string;
  subtitle: string;
  models: GalleryModel[];
  action: string;
}) {
  const [category, setCategory] = useState("Todos");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) counts.set(model.category, (counts.get(model.category) ?? 0) + 1);
    return [["Todos", models.length] as const, ...counts.entries()];
  }, [models]);

  const visible = category === "Todos" ? models : models.filter((model) => model.category === category);

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={title}>
        {categories.map(([name, count]) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={category === name}
            onClick={() => setCategory(name)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              category === name ? "bg-neon-green/10 text-neon-green" : "bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {name} <span className="ml-1 opacity-70">{count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((model) => {
          const Icon = model.icon;

          return (
            <article key={model.id} className="glow-border flex flex-col rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                  <Icon className="h-5 w-5 text-neon-green" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{model.title}</h3>
                  {model.meta && <p className="mt-0.5 text-xs text-muted">{model.meta}</p>}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted">{model.description}</p>

              {model.preview && (
                <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3.5">
                  <p className="text-sm leading-relaxed text-foreground/80">{model.preview}</p>
                </div>
              )}

              <SoonButton
                feature={model.title}
                className="mt-5 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-foreground"
              >
                {action}
              </SoonButton>
            </article>
          );
        })}
      </div>
    </section>
  );
}
