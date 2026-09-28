import { useTranslations } from "next-intl";
import { Briefcase, Megaphone, Video } from "lucide-react";

export function AudienceSection() {
  const t = useTranslations("Partners.audience");

  const items = [
    { icon: Megaphone, title: t("item1Title"), description: t("item1Description") },
    { icon: Video, title: t("item2Title"), description: t("item2Description") },
    { icon: Briefcase, title: t("item3Title"), description: t("item3Description") },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Icon className="h-6 w-6 text-emerald-400" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-white">{item.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
