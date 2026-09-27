"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { IntegrationApp } from "@/components/dashboard/integrations/apps-data";

export function AppCard({ app }: { app: IntegrationApp }) {
  const [connected, setConnected] = useState(Boolean(app.connected));
  const Icon = app.icon;

  return (
    <div className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-emerald-500/30 hover:bg-white/10">
      <div className="flex items-start justify-between">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${app.tint}1a` }}
        >
          <Icon className="h-5 w-5" style={{ color: app.tint }} />
        </span>

        {connected && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Conectado
          </span>
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-white">{app.name}</h3>
      <p className="mt-1.5 flex-1 text-sm text-white/50">{app.description}</p>

      <button
        type="button"
        onClick={() => setConnected((value) => !value)}
        className={`mt-5 flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
          connected
            ? "border border-white/15 text-white/80 hover:border-white/30 hover:bg-white/[0.03]"
            : "neon-green-btn bg-green-500 text-background hover:bg-green-400"
        }`}
      >
        {connected ? "Gerir" : "Conectar"}
      </button>
    </div>
  );
}
