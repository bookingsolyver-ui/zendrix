import { ArrowUpRight, ShieldCheck } from "lucide-react";

export function CurrentPlanCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
              Plano atual
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">Plano Pro</p>
            <p className="mt-1 text-sm text-white/50">
              Próxima cobrança em 15 de outubro · Kz 34.999
            </p>
          </div>
        </div>

        <button
          type="button"
          className="neon-btn flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold text-background"
        >
          Fazer Upgrade para Enterprise
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
