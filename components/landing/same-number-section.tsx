import { useTranslations } from "next-intl";
import { RadioTower } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

export function SameNumberSection() {
  const t = useTranslations("Landing.sameNumber");
  const agents = [t("agent1"), t("agent2"), t("agent3")];
  const agentColors = ["bg-emerald-500", "bg-primary", "bg-amber-400"];

  return (
    <section id="section-same-number" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/50 lg:mx-0">{t("subtitle")}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366]/10 ring-1 ring-[#25D366]/25">
                <WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{t("phoneLabel")}</p>
                <p className="text-xs text-white/40">+244 923 456 789</p>
              </div>
            </div>
            <RadioTower className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="my-6 flex items-center justify-center gap-2">
            {Array.from({ length: 14 }).map((_, index) => (
              <span key={index} className="h-px flex-1 bg-gradient-to-r from-emerald-500/60 to-primary/60" />
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{t("inboxLabel")}</p>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t("syncedLabel")}
              </span>
            </div>

            <div className="mt-4 flex -space-x-2">
              {agents.map((agent, index) => (
                <span
                  key={agent}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-background text-xs font-semibold text-background ${agentColors[index]}`}
                >
                  {agent.charAt(0)}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <div className="h-2 w-3/4 rounded-full bg-white/10" />
              <div className="h-2 w-1/2 rounded-full bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
