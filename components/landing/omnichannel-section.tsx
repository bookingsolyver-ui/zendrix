import { useTranslations } from "next-intl";
import { Camera, MessageCircle } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

export function OmnichannelSection() {
  const t = useTranslations("Landing.omnichannel");

  const columns = [
    {
      icon: WhatsAppGlyph,
      color: "#25D366",
      label: t("col1Label"),
      message: t("col1Message"),
    },
    {
      icon: Camera,
      color: "#E1306C",
      label: t("col2Label"),
      message: t("col2Message"),
    },
    {
      icon: MessageCircle,
      color: "#0084FF",
      label: t("col3Label"),
      message: t("col3Message"),
    },
  ];

  return (
    <section id="section-meta-channels" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;

          return (
            <div
              key={column.label}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${column.color}1a` }}
                >
                  <Icon className="h-4 w-4" style={{ color: column.color }} />
                </span>
                <p className="text-sm font-semibold text-foreground">{column.label}</p>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3">
                <p className="text-xs leading-relaxed text-white/70">{column.message}</p>
              </div>

              <div className="mt-3 h-16 rounded-xl border border-dashed border-white/10" />
            </div>
          );
        })}
      </div>

      <div className="relative mt-6 flex justify-center">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400">
          {t("queueNote")}
        </div>
      </div>
    </section>
  );
}
