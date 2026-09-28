"use client";

import { Play } from "lucide-react";
import { usePanels } from "@/components/dashboard/panels-context";

export function FaqVideoSection() {
  const { openTutorials } = usePanels();

  return (
    <div>
      <h2 className="text-[18px] font-medium text-white">Dúvidas frequentes</h2>
      <p className="mt-1 text-[12px] text-white/50">
        A conexão do WhatsApp do começo ao fim: Coexistente ou número dedicado, o que a Meta
        cobra e como o time atende.
      </p>

      <button
        type="button"
        onClick={openTutorials}
        className="group mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-emerald-500/30 hover:bg-white/10"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <Play className="h-5 w-5 fill-emerald-500/20 text-emerald-500" />
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Ver o passo a passo em vídeo</p>
            <p className="text-xs text-white/40">1 vídeo · 30 min no total</p>
          </div>
        </div>

        <span className="text-xs text-white/50 transition-colors group-hover:text-emerald-400">
          Assistir
        </span>
      </button>
    </div>
  );
}
