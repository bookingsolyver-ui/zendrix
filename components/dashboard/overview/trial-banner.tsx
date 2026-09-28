import { Clock } from "lucide-react";

export function TrialBanner() {
  return (
    <div className="-mx-4 -mt-6 mb-6 flex flex-col gap-3 border-b border-white/10 px-4 py-3 text-white sm:-mx-6 sm:-mt-8 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-white/40" />
        Teste grátis do Pro · 14 dias restantes
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/5"
        >
          Lembrar mais tarde
        </button>
        <button
          type="button"
          className="rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400"
        >
          Escolher plano
        </button>
      </div>
    </div>
  );
}
