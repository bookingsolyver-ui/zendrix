import { useTranslations } from "next-intl";
import { PhoneMockup } from "@/components/landing/phone-mockup";

export function HeroMockupCollage() {
  const t = useTranslations("Landing.hero");

  return (
    <div className="relative mx-auto w-[300px] lg:mx-0 lg:h-[600px] lg:w-full lg:max-w-[640px]">
      {/* Inbox — camada de fundo, colagem visível apenas em ecrãs largos */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl lg:absolute lg:right-0 lg:top-16 lg:flex lg:w-[400px]">
        <div className="w-[150px] shrink-0 border-r border-white/5 bg-white/[0.02]">
          <div className="border-b border-white/5 px-3.5 py-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {t("inboxTitle")}
            </p>
          </div>
          <div className="border-l-2 border-emerald-500 bg-emerald-500/5 px-3.5 py-3">
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium text-foreground">
                {t("phoneContact")}
              </span>
              <span className="shrink-0 text-[9px] text-emerald-400">{t("inboxTimeNow")}</span>
            </div>
            <p className="truncate text-[10px] text-white/40">{t("phoneMessage1")}</p>
          </div>
          <div className="border-l-2 border-transparent px-3.5 py-3">
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="truncate text-xs font-medium text-white/60">
                {t("inboxContact2Name")}
              </span>
              <span className="shrink-0 text-[9px] text-white/30">{t("inboxContact2Time")}</span>
            </div>
            <p className="truncate text-[10px] text-white/30">{t("inboxContact2Preview")}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-black/40">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{t("phoneContact")}</p>
              <p className="truncate text-[10px] text-white/40">{t("inboxChannel")}</p>
            </div>
            <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[9px] font-medium text-emerald-400">
              {t("inboxOnlineLabel")}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="max-w-[85%] self-start rounded-xl rounded-tl-sm border border-white/10 bg-white/5 p-2.5 text-[11px] leading-relaxed text-white/80">
              {t("phoneMessage1")}
            </div>
            <div className="max-w-[85%] self-end rounded-xl rounded-tr-sm border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-[11px] leading-relaxed text-emerald-100">
              {t("phoneMessage2")}
            </div>

            <div className="mt-auto rounded-lg border border-dashed border-amber-400/30 bg-amber-400/10 p-2.5">
              <p className="mb-1 text-[10px] font-semibold text-amber-400">{t("inboxTakeoverLabel")}</p>
              <p className="text-[10px] leading-relaxed text-amber-200/70">{t("inboxTakeover")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Telemóvel — camada da frente, flutua sobre a Inbox */}
      <div className="relative z-10 lg:absolute lg:left-0 lg:top-0 lg:transition-transform lg:duration-500 lg:hover:-translate-y-3">
        <PhoneMockup />
      </div>
    </div>
  );
}
