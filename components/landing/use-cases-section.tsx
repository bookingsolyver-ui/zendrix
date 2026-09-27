"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, Shirt, Stethoscope, UtensilsCrossed } from "lucide-react";

const TABS = [
  { key: "moda", icon: Shirt },
  { key: "clinicas", icon: Stethoscope },
  { key: "cursos", icon: GraduationCap },
  { key: "restaurantes", icon: UtensilsCrossed },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function UseCasesSection() {
  const t = useTranslations("Landing.useCases");
  const [active, setActive] = useState<TabKey>("moda");

  const timeline = t.raw(`timelines.${active}`) as { time: string; text: string }[];

  return (
    <section id="section-use-cases" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors lg:w-full ${
                  isActive
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`tabs.${tab.key}`)}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-8">
          <ol className="relative space-y-8 border-l border-white/10 pl-6">
            {timeline.map((item) => (
              <li key={item.time} className="relative">
                <span className="absolute -left-[27px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-emerald-500" />
                <p className="text-xs font-semibold text-emerald-400">{item.time}</p>
                <p className="mt-1 text-sm text-white/70">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
