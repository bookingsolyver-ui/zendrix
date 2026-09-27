import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";

export function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="glow-border rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
          <Icon className="h-4 w-4 text-muted" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>

      <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-neon-green/10 px-2.5 py-1 text-xs font-semibold text-neon-green">
        <TrendingUp className="h-3.5 w-3.5" />
        {trend}
      </span>
    </div>
  );
}
