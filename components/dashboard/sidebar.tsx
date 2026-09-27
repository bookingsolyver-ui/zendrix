"use client";

import { useEffect, useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { NAV_ENTRIES, NAV_FOOTER_ENTRIES, type NavGroup } from "@/components/dashboard/nav-config";

function isGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of NAV_ENTRIES) {
      if (entry.type === "group") {
        initial[entry.label] = isGroupActive(entry, pathname);
      }
    }
    return initial;
  });

  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(label: string) {
    if (collapsed) {
      onToggleCollapsed();
    }
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-surface/95 backdrop-blur transition-all duration-200 ease-out md:sticky md:top-0 md:z-0 md:translate-x-0 md:bg-surface/60 md:backdrop-blur-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[76px]" : "w-72"} md:h-screen`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-5">
          {collapsed ? (
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-sm font-bold">
              <span className="neon-green-text">Z</span>
            </span>
          ) : (
            <Logo />
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ENTRIES.map((entry) => {
            if (entry.type === "link") {
              const isActive = pathname === entry.href;
              const Icon = entry.icon;

              return (
                <Link
                  key={entry.label}
                  href={entry.href}
                  title={collapsed ? entry.label : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? "bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-neon-green" : ""}`}
                  />
                  {!collapsed && entry.label}
                </Link>
              );
            }

            const GroupIcon = entry.icon;
            const active = isGroupActive(entry, pathname);
            const open = collapsed ? active : Boolean(openGroups[entry.label]);

            return (
              <div key={entry.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  title={collapsed ? entry.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "text-foreground"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <GroupIcon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-neon-green" : ""}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{entry.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>

                {!collapsed && open && (
                  <div className="ml-[22px] mt-1 space-y-1 border-l border-border pl-4">
                    {entry.items.map((item) => {
                      const isActive = pathname === item.href;
                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-surface-2 font-medium text-foreground"
                              : "text-muted hover:bg-surface-2 hover:text-foreground"
                          }`}
                        >
                          <ItemIcon className={`h-4 w-4 shrink-0 ${isActive ? "text-neon-green" : ""}`} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border px-3 py-4">
          {NAV_FOOTER_ENTRIES.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-neon-green" : ""}`} />
                {!collapsed && item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:flex ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
                Colapsar menu
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
