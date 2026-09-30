import { useTranslations } from "next-intl";
import { Bot, Check, Headset } from "lucide-react";

// Ilustração do produto: dados de exemplo, claramente marcados como tal.
export function ProductPreview() {
  const t = useTranslations("Landing.preview");

  return (
    <section id="section-preview" className="relative mx-auto max-w-6xl px-6 pb-4 pt-4 sm:pt-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-2xl shadow-emerald-500/5">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-xs text-white/40">{t("window")}</span>
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {t("sample")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr]">
          <aside className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
            {(["c1", "c2", "c3"] as const).map((c, i) => (
              <div
                key={c}
                className={`rounded-xl px-3 py-2.5 ${i === 0 ? "bg-white/[0.06]" : ""}`}
              >
                <p className="text-sm font-medium text-foreground">{t(`${c}.name`)}</p>
                <p className="truncate text-xs text-white/40">{t(`${c}.preview`)}</p>
              </div>
            ))}
          </aside>

          <div className="space-y-3 p-5 sm:p-6">
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-2.5 text-sm text-white/80">
              {t("customerMessage")}
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-500/15 px-4 py-2.5 text-sm text-white/90">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Bot className="h-3.5 w-3.5" />
                {t("aiLabel")}
              </span>
              {t("aiMessage")}
            </div>
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-white/50">
              <Headset className="h-3.5 w-3.5" />
              {t("handoff")}
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-2.5 text-sm text-white/80">
              {t("customerFollowup")}
            </div>
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-white/[0.04] px-4 py-2.5 text-sm text-white/90">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/50">
                <Check className="h-3.5 w-3.5" />
                {t("agentLabel")}
              </span>
              {t("agentMessage")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
