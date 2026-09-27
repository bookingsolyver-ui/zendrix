"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALE_LABELS: Record<string, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  return (
    <select
      aria-label="Idioma / Language / Idioma"
      className="cursor-pointer rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors hover:border-primary focus:border-primary"
      value={locale}
      onChange={(event) => {
        const nextLocale = event.target.value;
        router.replace(
          // @ts-expect-error -- pathname/params come from the current dynamic route
          { pathname, params },
          { locale: nextLocale },
        );
      }}
    >
      {routing.locales.map((code) => (
        <option key={code} value={code} className="bg-surface-2 text-foreground">
          {LOCALE_LABELS[code] ?? code.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
