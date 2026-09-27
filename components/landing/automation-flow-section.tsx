import { useTranslations } from "next-intl";
import { Clock, Gift, Zap } from "lucide-react";

export function AutomationFlowSection() {
  const t = useTranslations("Landing.automations");

  const nodes = [
    { icon: Zap, label: t("node1"), tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
    { icon: Clock, label: t("node2"), tone: "border-white/15 bg-white/[0.03] text-white/70" },
    { icon: Gift, label: t("node3"), tone: "border-primary/40 bg-primary/10 text-primary-2" },
  ];

  return (
    <section id="section-features" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="relative mt-14 overflow-x-auto">
        <div className="mx-auto flex min-w-[640px] max-w-3xl items-center justify-center gap-0 px-6">
          {nodes.map((node, index) => {
            const Icon = node.icon;

            return (
              <div key={node.label} className="flex items-center">
                <div
                  className={`flex w-56 flex-col items-start gap-2 rounded-2xl border px-5 py-4 ${node.tone}`}
                >
                  <Icon className="h-4 w-4" />
                  <p className="text-sm font-medium text-foreground">{node.label}</p>
                </div>

                {index < nodes.length - 1 && (
                  <div className="mx-3 flex items-center">
                    <span className="h-px w-8 bg-gradient-to-r from-white/30 to-white/10 sm:w-16" />
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
