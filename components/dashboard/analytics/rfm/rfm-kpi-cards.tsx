import { Crown, TrendingDown, TrendingUp, Users } from "lucide-react";
import { TOTAL_CUSTOMERS } from "@/components/dashboard/analytics/rfm/segment-data";

function withThousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function RfmKpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Total de Clientes</span>
          <Users className="h-4 w-4 text-white/30" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">{withThousands(TOTAL_CUSTOMERS)}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Participação da Receita VIP</span>
          <Crown className="h-4 w-4 text-amber-300" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">45%</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Receita em Risco</span>
          <TrendingDown className="h-4 w-4 text-amber-400" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-amber-400">Kz 2.450.000</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Oportunidade de Retomada</span>
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <p className="mt-3 text-2xl font-semibold text-white">Kz 8.900.000</p>
      </div>
    </div>
  );
}
