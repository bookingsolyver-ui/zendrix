const DAYS = [
  { label: "Seg", height: 45 },
  { label: "Ter", height: 58 },
  { label: "Qua", height: 40 },
  { label: "Qui", height: 72 },
  { label: "Sex", height: 65 },
  { label: "Sáb", height: 88 },
  { label: "Dom", height: 100 },
];

export function RevenueChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Evolução dos últimos 7 dias</h2>

      <div className="mt-6 flex h-48 items-end gap-3">
        {DAYS.map((day) => (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end">
              <div
                style={{ height: `${day.height}%` }}
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/70 to-emerald-300/50 transition-all"
              />
            </div>
            <span className="text-xs text-white/40">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
