import { useTranslations } from "next-intl";
import { Rocket, Settings2, User } from "lucide-react";

export function WorkWithSection() {
  const t = useTranslations("Landing.workWith");

  const cards = [
    { key: "selfServe", icon: User },
    { key: "setup", icon: Settings2 },
    { key: "managed", icon: Rocket },
  ] as const;

  return (
    <section id="section-work-with" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {cards.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Icon className="h-4.5 w-4.5 text-emerald-400" />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">{t(`${key}.title`)}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">{t(`${key}.description`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
