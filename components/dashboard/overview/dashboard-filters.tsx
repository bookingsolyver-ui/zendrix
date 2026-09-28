import { ChevronDown } from "lucide-react";

export function DashboardFilters() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <select
            disabled
            className="appearance-none rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-9 text-sm text-white/50 outline-none"
            defaultValue="none"
          >
            <option value="none">Nenhuma métrica de conversão ainda</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        </div>

        <div className="relative">
          <select
            defaultValue="30d"
            className="appearance-none rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-9 text-sm text-white outline-none focus:border-emerald-500/50"
          >
            <option value="today" className="bg-[#111]">
              Hoje
            </option>
            <option value="7d" className="bg-[#111]">
              Últimos 7 dias
            </option>
            <option value="30d" className="bg-[#111]">
              Últimos 30 dias
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        </div>
      </div>
    </div>
  );
}
