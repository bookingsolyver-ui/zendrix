"use client";

import { Bell, CirclePlay, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { usePanels } from "@/components/dashboard/panels-context";

export function DashboardTopbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const t = useTranslations("Dashboard");
  const { openNotifications, openTutorials } = usePanels();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <input
          type="search"
          placeholder={t("search")}
          className="w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openTutorials}
          aria-label="Dúvidas frequentes e tutoriais"
          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <CirclePlay className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={openNotifications}
          aria-label="Notificações"
          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
