"use client";

import { useState } from "react";

const RANGES = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
] as const;

export function DateRangeFilter() {
  const [active, setActive] = useState<(typeof RANGES)[number]["key"]>("7d");

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 p-1">
      {RANGES.map((range) => (
        <button
          key={range.key}
          type="button"
          onClick={() => setActive(range.key)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            active === range.key
              ? "bg-surface text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
              : "text-muted hover:text-foreground"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
