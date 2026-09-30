import { Eye, MousePointerClick, Send } from "lucide-react";

export type MessageMetrics = {
  delivered: number;
  read: number;
};

function formatCount(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function MetricCards({ metrics }: { metrics: MessageMetrics }) {
  // Real numbers from the Message table. Delivery/read states come from Meta's status webhooks.
  const openRate = metrics.delivered > 0 ? `${Math.round((metrics.read / metrics.delivered) * 100)}%` : "—";

  const cards = [
    { icon: Send, label: "Mensagens Entregues", value: formatCount(metrics.delivered), hint: metrics.delivered === 0 ? "Sem mensagens entregues ainda" : undefined },
    { icon: Eye, label: "Taxa de Abertura", value: openRate, hint: metrics.delivered === 0 ? "Sem mensagens para calcular" : "Mensagens lidas / entregues" },
    { icon: MousePointerClick, label: "Taxa de Clique (CTR)", value: "—", hint: "Ainda não medido" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
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
            {card.hint && <p className="mt-1 text-xs text-white/40">{card.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
