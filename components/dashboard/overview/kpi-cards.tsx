import { MessageCircle, Percent, ShoppingCart, TrendingUp, Wallet } from "lucide-react";

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Receita Total</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Wallet className="h-4 w-4 text-emerald-400" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">Kz 12.450.000</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <TrendingUp className="h-3 w-3" />
          +15% vs mês passado
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Carrinhos Recuperados</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingCart className="h-4 w-4 text-primary-2" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">342</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Conversas Ativas</span>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <MessageCircle className="h-4 w-4 text-blue-400" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">89</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Taxa de Conversão</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Percent className="h-4 w-4 text-amber-400" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">4.2%</p>
      </div>
    </div>
  );
}
