"use client";

import { ExternalLink, X } from "lucide-react";
import { usePanels } from "@/components/dashboard/panels-context";

export function TutorialsPanel() {
  const { tutorialsOpen, closeTutorials } = usePanels();

  return (
    <>
      <div
        aria-hidden
        onClick={closeTutorials}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${
          tutorialsOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Dúvidas frequentes"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-[400px] transform border-l border-white/10 bg-[#111] shadow-2xl transition-transform duration-300 ${
          tutorialsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-white">Dúvidas frequentes</h2>
                  <span className="text-xs text-white/40">30 min no total</span>
                </span>
              </div>
              <button
                type="button"
                onClick={closeTutorials}
                aria-label="Fechar dúvidas frequentes"
                className="shrink-0 rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <a
              href="#"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-emerald-400"
            >
              Ver a playlist no YouTube
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <button
              type="button"
              className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-emerald-500/30 hover:bg-white/10"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/60">
                1
              </span>

              <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-black p-1.5 text-center">
                <span className="text-[9px] font-bold leading-tight text-emerald-500">
                  A META COBRA O SEU WHATSAPP?
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">
                  Visão geral: conexão e inbox
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-white/40">
                  Coexistente ou número dedicado, o cartão que a Meta pede e o que ela cobra de
                  verdade.
                </span>
              </span>

              <span className="shrink-0 text-xs text-white/40">29:40</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
