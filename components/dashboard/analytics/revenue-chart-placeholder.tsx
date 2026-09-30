import { BarChart3 } from "lucide-react";

export function RevenueChartPlaceholder() {
  return (
    <div className="glow-border relative overflow-hidden rounded-2xl p-6">
      <div className="relative flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Receita ao longo do tempo</h2>
          <p className="mt-1 text-sm text-muted">Ainda não há receita registada.</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
          <BarChart3 className="h-4 w-4 text-muted" />
        </span>
      </div>

      <div className="relative mt-8 flex h-48 items-center justify-center rounded-xl border border-dashed border-border">
        <p className="px-6 text-center text-sm text-muted">
          O gráfico aparece aqui quando existirem vendas.
        </p>
      </div>
    </div>
  );
}
