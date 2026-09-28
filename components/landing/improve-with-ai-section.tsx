"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";

const DIRECTIONS = ["brandVoice", "shorter", "persuasive"] as const;
type Direction = (typeof DIRECTIONS)[number];

export function ImproveWithAiSection() {
  const t = useTranslations("Landing.improveWithAi");
  const [active, setActive] = useState<Direction>("brandVoice");

  return (
    <section id="section-improve-ai" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400 lg:justify-start">
            <Sparkles className="h-3.5 w-3.5" />
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/50 lg:mx-0">{t("subtitle")}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/30">
            {t("draftLabel")}
          </p>
          <p className="mt-2.5 rounded-xl border border-white/5 bg-black/30 p-3.5 text-sm leading-relaxed text-white/60">
            {t("draftText")}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {DIRECTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActive(key)}
                aria-pressed={active === key}
                className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                  active === key
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:text-white/70"
                }`}
              >
                {t(`directions.${key}`)}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">
              {t("resultLabel")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/90">
              {t(`results.${active}`)}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400/80">
              <Check className="h-3.5 w-3.5 shrink-0" />
              {t("variablePreserved")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
