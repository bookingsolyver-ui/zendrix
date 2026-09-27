import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";

export function PhoneMockup() {
  const t = useTranslations("Landing.hero");

  return (
    <div className="relative mx-auto w-[270px] sm:w-[300px]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 -bottom-8 h-32 rounded-full bg-emerald-500/15 blur-3xl"
      />

      <div className="relative rounded-[2.5rem] border-[8px] border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl shadow-black/60">
        <div className="relative h-[560px] overflow-hidden rounded-[2rem] bg-[#0b141a]">
          <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />

          <div className="flex items-center gap-2.5 bg-[#1f2c34] px-4 pb-3 pt-7">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
              {t("phoneContact").charAt(0)}
            </span>
            <div>
              <p className="text-xs font-semibold text-white">{t("phoneContact")}</p>
              <p className="text-[10px] text-emerald-400">online</p>
            </div>
          </div>

          <div className="space-y-2.5 px-3 py-4">
            <div className="max-w-[78%] rounded-xl rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-[11px] leading-relaxed text-white/90">
              {t("phoneMessage1")}
            </div>

            <div className="ml-auto max-w-[78%] rounded-xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-[11px] leading-relaxed text-white">
              {t("phoneMessage2")}
            </div>

            <div className="ml-auto max-w-[88%] rounded-2xl border border-emerald-500/30 bg-[#0f1c17] p-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                <ShoppingCart className="h-3 w-3" />
                {t("phoneBadge")}
              </span>
              <button
                type="button"
                className="mt-2.5 w-full rounded-lg bg-green-500 py-2.5 text-[11px] font-semibold text-background"
              >
                {t("phonePayButton")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
