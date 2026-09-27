import { Eye, MousePointerClick, Send } from "lucide-react";

const CARDS = [
  { icon: Send, label: "Mensagens Entregues", value: "24.680" },
  { icon: Eye, label: "Taxa de Abertura", value: "85%" },
  { icon: MousePointerClick, label: "Taxa de Clique (CTR)", value: "12%" },
];

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/50">{card.label}</span>
              <Icon className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
