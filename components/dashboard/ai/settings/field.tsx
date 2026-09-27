import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/50">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const fieldInputClassName =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15";
