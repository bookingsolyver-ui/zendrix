import { useTranslations } from "next-intl";

type Feature = { title: string; description: string };

const ICONS = ["\u{1F310}", "\u{1F4B3}", "\u{1F91D}", "\u{26A1}"];

export function Features() {
  const t = useTranslations("Landing");
  const features = t.raw("features") as Feature[];

  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("featuresTitle")}
        </h2>
        <p className="mt-4 text-lg text-muted">{t("featuresSubtitle")}</p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="glow-border rounded-2xl p-7 transition-colors hover:border-primary"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-xl">
              {ICONS[index % ICONS.length]}
            </span>
            <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
