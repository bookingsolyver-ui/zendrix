import { AlertTriangle, Percent, ShoppingCart } from "lucide-react";
import { CHECKOUT_STATS } from "@/components/dashboard/ecommerce/checkouts/checkouts-data";

export function CheckoutStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Carrinhos Abandonados Hoje</span>
          <ShoppingCart className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">{CHECKOUT_STATS.abandonedToday}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Taxa de Recuperação</span>
          <Percent className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">{CHECKOUT_STATS.recoveryRate}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Valor em Risco</span>
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-amber-400">{CHECKOUT_STATS.amountAtRisk}</p>
      </div>
    </div>
  );
}
