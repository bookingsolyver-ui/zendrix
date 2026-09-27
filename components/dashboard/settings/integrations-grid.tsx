"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { INTEGRATIONS } from "@/components/dashboard/settings/integrations-data";

export function IntegrationsGrid() {
  const [connected, setConnected] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const integration of INTEGRATIONS) {
      if (integration.connectedByDefault) initial[integration.id] = true;
    }
    return initial;
  });

  function toggleConnected(id: string) {
    setConnected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {INTEGRATIONS.map((integration) => {
        const Icon = integration.icon;
        const isConnected = Boolean(connected[integration.id]);

        return (
          <div
            key={integration.id}
            className="glow-border flex flex-col rounded-2xl p-5 transition-colors hover:border-primary"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${integration.tint}1a` }}
            >
              <Icon className="h-5 w-5" style={{ color: integration.tint }} />
            </span>

            <h3 className="mt-4 text-sm font-semibold text-foreground">{integration.name}</h3>
            <p className="mt-1.5 flex-1 text-sm text-muted">{integration.description}</p>

            <button
              type="button"
              onClick={() => toggleConnected(integration.id)}
              aria-pressed={isConnected}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                isConnected
                  ? "border border-neon-green/50 bg-neon-green/10 text-neon-green"
                  : "glow-border text-foreground hover:border-primary"
              }`}
            >
              {isConnected && <CheckCircle2 className="h-4 w-4" />}
              {isConnected ? "Conectado" : "Conectar"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
