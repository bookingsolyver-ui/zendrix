import { BarChart3 } from "lucide-react";

const BAR_HEIGHTS = [38, 52, 44, 65, 58, 72, 60, 80, 70, 90, 84, 96];

export function RevenueChartPlaceholder() {
  return (
    <div className="glow-border relative overflow-hidden rounded-2xl p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent"
      />

      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Receita ao longo do tempo</h2>
          <p className="mt-1 text-sm text-muted">O gráfico interativo será apresentado aqui.</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
          <BarChart3 className="h-4 w-4 text-muted" />
        </span>
      </div>

      <div className="relative mt-8 flex h-48 items-end gap-2 sm:gap-3">
        {BAR_HEIGHTS.map((height, index) => (
          <div
            key={index}
            style={{ height: `${height}%` }}
            className="flex-1 rounded-t-md bg-gradient-to-t from-primary/70 to-primary-2/70 opacity-70"
          />
        ))}
      </div>
    </div>
  );
}
