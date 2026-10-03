import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

const QUESTION_KEYS = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
] as const;

export function FaqSection() {
  const t = useTranslations("Landing.faq");

  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-4 text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {QUESTION_KEYS.map((key) => (
          <details key={key} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-left">
              <span className="text-sm font-medium text-foreground sm:text-base">
                {t(`${key}.question`)}
              </span>
              <Plus className="mt-0.5 h-4 w-4 shrink-0 text-white/40 transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">
              {t(`${key}.answer`)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
