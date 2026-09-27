"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function DashboardTopbar() {
  const t = useTranslations("Dashboard");

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
      <input
        type="search"
        placeholder={t("search")}
        className="w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
      />
      <LocaleSwitcher />
    </header>
  );
}
