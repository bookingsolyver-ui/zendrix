type UsageItem = {
  label: string;
  used: number;
  total: number;
  unitLabel: string;
};

const USAGE_ITEMS: UsageItem[] = [
  { label: "Mensagens de WhatsApp enviadas", used: 8450, total: 10000, unitLabel: "" },
  { label: "Minutos de Áudio IA", used: 45, total: 100, unitLabel: " min" },
  { label: "Agentes na Equipa", used: 3, total: 5, unitLabel: "" },
];

function withThousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function UsageBars() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Limites de Uso</h2>

      <div className="mt-5 space-y-5">
        {USAGE_ITEMS.map((item) => {
          const percentage = Math.min(100, Math.round((item.used / item.total) * 100));

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">{item.label}</span>
                <span className="font-medium text-white">
                  {withThousands(item.used)}
                  {item.unitLabel} / {withThousands(item.total)}
                  {item.unitLabel}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
