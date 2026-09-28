import { useTranslations } from "next-intl";
import { BarChart3, MessageSquare, Users } from "lucide-react";
import { formatPrice } from "@/components/dashboard/billing/pricing-data";

const CAMPAIGN_COST_AOA = 24500;

export function CampaignsSection() {
  const t = useTranslations("Landing.campaigns");
  const stats = t.raw("dispatchStats") as { label: string; value: string }[];

  return (
    <section id="section-campaigns" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Passo 1 — Segmento */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-400">
              1
            </span>
            <p className="text-sm font-semibold text-foreground">{t("step1Title")}</p>
          </div>
          <p className="mt-2 text-xs text-white/50">{t("step1Description")}</p>

          <div className="mt-5 rounded-xl border border-white/5 bg-black/30 p-3.5">
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <Users className="h-3.5 w-3.5 shrink-0 text-white/30" />
              {t("segmentRule")}
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/5 pt-3">
              <span className="text-[10px] text-white/30">{t("estimatedCostLabel")}</span>
              <span className="text-sm font-semibold text-emerald-400">
                {formatPrice(CAMPAIGN_COST_AOA, "AOA")}
              </span>
            </div>
          </div>
        </div>

        {/* Passo 2 — Template */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-400">
              2
            </span>
            <p className="text-sm font-semibold text-foreground">{t("step2Title")}</p>
          </div>
          <p className="mt-2 text-xs text-white/50">{t("step2Description")}</p>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/5 bg-[#0b141a]">
            <div className="flex items-center gap-2 bg-[#202c33] px-3 py-2">
              <MessageSquare className="h-3 w-3 shrink-0 text-emerald-400" />
              <span className="text-[10px] font-medium text-white/70">{t("templateName")}</span>
            </div>
            <div className="p-3">
              <div className="max-w-[90%] rounded-lg rounded-tl-none bg-[#202c33] p-2.5 text-[11px] leading-relaxed text-white/90">
                {t("templateMessage")}
              </div>
            </div>
          </div>
        </div>

        {/* Passo 3 — Disparo */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-semibold text-emerald-400">
              3
            </span>
            <p className="text-sm font-semibold text-foreground">{t("step3Title")}</p>
          </div>
          <p className="mt-2 text-xs text-white/50">{t("step3Description")}</p>

          <div className="mt-5 rounded-xl border border-white/5 bg-black/30 p-3.5">
            <div className="mb-2.5 flex items-center gap-1.5 text-[10px] text-white/30">
              <BarChart3 className="h-3 w-3 shrink-0" />
              {t("resultsLabel")}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
                  <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-white/40">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
