"use client";

import { Menu } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function DashboardTopbar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menu"
        className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <LocaleSwitcher />
      </div>
    </header>
  );
}
