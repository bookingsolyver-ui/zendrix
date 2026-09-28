import { BarChart3 } from "lucide-react";

const MONTHS = [
  { label: "Abr", height: 38 },
  { label: "Mai", height: 52 },
  { label: "Jun", height: 46 },
  { label: "Jul", height: 65 },
  { label: "Ago", height: 78 },
  { label: "Set", height: 100 },
];

export function RevenueEvolutionChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Evolução da Receita</h2>
          <p className="mt-1 text-xs text-white/40">Últimos 6 meses</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
          <BarChart3 className="h-4 w-4 text-white/50" />
        </span>
      </div>

      <div className="mt-8 flex h-56 items-end gap-3 sm:gap-5">
        {MONTHS.map((month) => (
          <div key={month.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end">
              <div
                style={{ height: `${month.height}%` }}
                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500/70 to-emerald-300/40 transition-all"
              />
            </div>
            <span className="text-xs text-white/40">{month.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
