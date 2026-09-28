"use client";

import { useState } from "react";
import { Bell, ChevronDown, X } from "lucide-react";
import { usePanels } from "@/components/dashboard/panels-context";

const TABS = ["Todas", "Meta", "Sistema", "Conta", "Atualizações"] as const;

export function NotificationsPanel() {
  const { notificationsOpen, closeNotifications } = usePanels();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Todas");

  return (
    <>
      <div
        aria-hidden
        onClick={closeNotifications}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${
          notificationsOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Notificações"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[400px] transform border-l border-white/10 bg-[#111] shadow-2xl transition-transform duration-300 ${
          notificationsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 pt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Notificações</h2>
              <button
                type="button"
                onClick={closeNotifications}
                aria-label="Fechar notificações"
                className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="mt-4 flex items-center gap-4 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 border-b-2 pb-2 text-sm transition-colors ${
                    activeTab === tab
                      ? "border-white text-white"
                      : "border-transparent text-white/70 hover:border-white hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            <div className="mt-3 flex items-center gap-2 pb-4">
              <div className="relative">
                <select className="appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-xs text-white/70 outline-none focus:border-emerald-500/50">
                  <option className="bg-[#111]">Status</option>
                  <option className="bg-[#111]">Não lidas</option>
                  <option className="bg-[#111]">Lidas</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
              </div>

              <div className="relative">
                <select className="appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-xs text-white/70 outline-none focus:border-emerald-500/50">
                  <option className="bg-[#111]">Severidade</option>
                  <option className="bg-[#111]">Informativo</option>
                  <option className="bg-[#111]">Aviso</option>
                  <option className="bg-[#111]">Crítico</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Bell className="h-10 w-10 text-white/20" strokeWidth={1.5} />
            <h3 className="mt-4 text-sm font-medium text-white">Nenhuma notificação</h3>
            <p className="mt-1.5 max-w-[260px] text-xs text-white/40">
              Avisos da Meta, do sistema e da sua conta aparecerão aqui.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
