import { useTranslations } from "next-intl";

type Stat = { value: string; label: string };

export function Stats() {
  const t = useTranslations("Landing");
  const stats = t.raw("stats") as Stat[];

  return (
    <section className="border-y border-border bg-surface/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="neon-text text-3xl font-semibold sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
