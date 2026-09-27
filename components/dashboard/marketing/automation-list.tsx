"use client";

import { useState } from "react";
import { Send, TrendingUp } from "lucide-react";
import { INITIAL_AUTOMATIONS } from "@/components/dashboard/marketing/automations-data";

export function AutomationList() {
  const [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);

  function toggleActive(id: string) {
    setAutomations((prev) =>
      prev.map((automation) =>
        automation.id === id ? { ...automation, active: !automation.active } : automation,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {automations.map((automation) => {
        const Icon = automation.icon;

        return (
          <div
            key={automation.id}
            className="glow-border flex flex-col gap-4 rounded-2xl p-5 transition-colors hover:border-primary sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="h-5 w-5 text-neon-green" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{automation.title}</h3>
                <p className="mt-1 max-w-md text-sm text-muted">{automation.trigger}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 sm:shrink-0">
              <div className="flex items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-neon-green" />
                  {automation.conversion}
                </span>
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {automation.sends}
                </span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={automation.active}
                onClick={() => toggleActive(automation.id)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  automation.active
                    ? "bg-neon-green/10 text-neon-green"
                    : "bg-surface-2 text-muted"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${automation.active ? "bg-neon-green" : "bg-muted"}`}
                />
                {automation.active ? "Ativado" : "Desativado"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
