import { TrendingUp } from "lucide-react";

export function RevenueHero() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-9">
      <p className="text-sm font-medium text-white/50">Receita Total Gerada</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-4">
        <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Kz 2.450.000</p>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400">
          <TrendingUp className="h-4 w-4" />
          +12% este mês
        </span>
      </div>
      <p className="mt-2 text-sm text-white/40">Comparado com os 30 dias anteriores</p>
    </div>
  );
}
