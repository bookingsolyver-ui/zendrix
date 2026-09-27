import type { LucideIcon } from "lucide-react";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="glow-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2">
          <Icon className={`h-4 w-4 ${accent ? "text-neon-green" : "text-muted"}`} />
        </span>
      </div>
      <p className={`mt-3 text-2xl font-semibold ${accent ? "neon-green-text" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
