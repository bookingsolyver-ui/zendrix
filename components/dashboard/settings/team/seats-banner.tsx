import { Users } from "lucide-react";
import { SEATS_TOTAL } from "@/components/dashboard/settings/team/team-data";

export function SeatsBanner({ occupied }: { occupied: number }) {
  const percentage = Math.round((occupied / SEATS_TOTAL) * 100);

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <Users className="h-4 w-4 text-emerald-400" />
          {occupied} de {SEATS_TOTAL} Vagas Ocupadas
        </span>
        <span className="text-xs text-white/40">{percentage}%</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
