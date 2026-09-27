import { CheckCheck, Eye, MousePointerClick } from "lucide-react";

const METRICS = [
  { icon: CheckCheck, label: "Taxa de Entrega Média", value: "98,4%" },
  { icon: Eye, label: "Taxa de Leitura", value: "71,2%" },
  { icon: MousePointerClick, label: "Cliques", value: "3.204" },
];

export function MetricTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {METRICS.map((metric) => {
        const Icon = metric.icon;

        return (
          <div
            key={metric.label}
            className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/50">{metric.label}</span>
              <Icon className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
          </div>
        );
      })}
    </div>
  );
}
