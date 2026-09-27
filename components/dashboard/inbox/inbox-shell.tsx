"use client";

import { useState } from "react";
import { Headset, Inbox as InboxIcon, Plus, Tag, User, UserX, Workflow } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

const FILTERS = [
  { key: "all", label: "Todas", icon: InboxIcon, count: 0 },
  { key: "mine", label: "Minhas", icon: User, count: 0 },
  { key: "unassigned", label: "Sem responsável", icon: UserX, count: 0 },
  { key: "human", label: "Atendimento Humano", icon: Headset, count: 0 },
] as const;

export function InboxShell() {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border md:flex-row">
      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-border bg-surface/60 p-4 md:h-full md:w-72 md:border-b-0 md:border-r">
        <nav className="space-y-1">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-neon-green" : ""}`} />
                <span className="flex-1 text-left">{filter.label}</span>
                <span className="rounded-full bg-background px-1.5 py-0.5 text-xs text-muted">
                  {filter.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Workflow className="h-3.5 w-3.5" />
              Automações
            </span>
            <button
              type="button"
              aria-label="Nova automação"
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Nenhuma automação configurada.</p>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </span>
            <button
              type="button"
              aria-label="Nova tag"
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Nenhuma tag criada.</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-background/40 p-10 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/10 ring-1 ring-[#25D366]/30">
          <WhatsAppGlyph className="h-10 w-10 text-[#25D366]" />
        </span>

        <div className="max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">
            Comece conectando o seu WhatsApp
          </h2>
          <p className="mt-2 text-sm text-muted">
            Ligue o seu número de WhatsApp Business e comece a responder aos seus clientes
            diretamente a partir do Inbox da Zentrix.
          </p>
        </div>

        <button
          type="button"
          className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400"
        >
          <WhatsAppGlyph className="h-4 w-4" />
          Conectar WhatsApp
        </button>
      </div>
    </div>
  );
}
