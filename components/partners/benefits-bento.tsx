import { useTranslations } from "next-intl";
import { Cookie, Infinity, LayoutDashboard } from "lucide-react";

export function BenefitsBento() {
  const t = useTranslations("Partners.benefits");

  const items = [
    {
      icon: Infinity,
      title: t("item1Title"),
      description: t("item1Description"),
      wide: true,
    },
    {
      icon: Cookie,
      title: t("item2Title"),
      description: t("item2Description"),
      wide: false,
    },
    {
      icon: LayoutDashboard,
      title: t("item3Title"),
      description: t("item3Description"),
      wide: false,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className={`rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-white/[0.04] ${
                item.wide ? "sm:col-span-2" : ""
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Icon className="h-5 w-5 text-emerald-400" />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
