"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { PanelsProvider } from "@/components/dashboard/panels-context";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { TutorialsPanel } from "@/components/dashboard/tutorials-panel";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PanelsProvider>
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>

      <NotificationsPanel />
      <TutorialsPanel />
    </PanelsProvider>
  );
}
