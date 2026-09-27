"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const NAV_ITEMS = [
  { key: "overview", href: "/dashboard", icon: "\u{1F4CA}" },
  { key: "sales", href: "/dashboard/vendas", icon: "\u{1F4B0}" },
  { key: "affiliates", href: "/dashboard/afiliados", icon: "\u{1F91D}" },
  { key: "products", href: "/dashboard/produtos", icon: "\u{1F4E6}" },
  { key: "wallet", href: "/dashboard/carteira", icon: "\u{1F4B3}" },
] as const;

export function DashboardSidebar() {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface/60 md:flex">
      <div className="flex items-center gap-2 border-b border-border px-6 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg neon-btn text-sm font-bold text-background">
          Z
        </span>
        <span className="text-lg font-semibold tracking-tight">Zentrix</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <span
                className={`text-base ${isActive ? "neon-text" : ""}`}
                aria-hidden
              >
                {item.icon}
              </span>
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-4">
        <div className="glow-border flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">
            OL
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{t("account")}</p>
            <p className="truncate text-xs text-muted">Zentrix</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
