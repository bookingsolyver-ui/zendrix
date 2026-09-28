import { useTranslations } from "next-intl";
import { ArrowRight, Gift, Zap } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

export function PopupToWhatsAppSection() {
  const t = useTranslations("Landing.popupToWhatsapp");

  return (
    <section id="section-any-source" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-14 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-center">
        {/* Passo 1 — Pop-up na loja */}
        <div className="w-full max-w-xs shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
            {t("step1Label")}
          </p>
          <Gift className="mx-auto mt-3 h-7 w-7 text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-foreground">{t("step1Title")}</p>
          <p className="mt-1.5 text-xs text-white/50">{t("step1Description")}</p>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/40">
            +244 9XX XXX XXX
          </div>
        </div>

        <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-emerald-400 lg:rotate-0" />

        {/* Passo 2 — Zentrix */}
        <div className="w-full max-w-xs shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
            {t("step2Label")}
          </p>
          <Zap className="mx-auto mt-3 h-7 w-7 text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-foreground">{t("step2Title")}</p>
          <div className="mt-4 space-y-1.5 text-left">
            <p className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-[10.5px] text-white/60">
              {t("step2Trigger")}
            </p>
            <p className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-[10.5px] text-white/60">
              {t("step2Segment")}
            </p>
            <p className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-[10.5px] text-white/60">
              {t("step2Variable")}
            </p>
          </div>
        </div>

        <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-emerald-400 lg:rotate-0" />

        {/* Passo 3 — WhatsApp */}
        <div className="w-full max-w-xs shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
            {t("step3Label")}
          </p>
          <WhatsAppGlyph className="mx-auto mt-3 h-7 w-7 text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-foreground">{t("step3Title")}</p>
          <div className="mt-4 max-w-[90%] rounded-lg rounded-tl-none bg-[#202c33] p-2.5 text-left text-[11px] leading-relaxed text-white/90">
            {t("step3Message")}
          </div>
        </div>
      </div>
    </section>
  );
}
