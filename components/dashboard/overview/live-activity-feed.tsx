import { Radio } from "lucide-react";

type ActivityEvent = {
  id: string;
  dotColor: string;
  text: string;
  time: string;
};

const EVENTS: ActivityEvent[] = [
  {
    id: "evt-1",
    dotColor: "bg-emerald-500",
    text: "Maria pagou o pedido #1042 via Multicaixa Express",
    time: "há 2 min",
  },
  {
    id: "evt-2",
    dotColor: "bg-amber-500",
    text: "João abandonou o carrinho",
    time: "há 5 min",
  },
  {
    id: "evt-3",
    dotColor: "bg-blue-500",
    text: "Nova conversa iniciada via Instagram Direct",
    time: "há 12 min",
  },
  {
    id: "evt-4",
    dotColor: "bg-emerald-500",
    text: "Pagamento confirmado — Óscar Lopes",
    time: "há 18 min",
  },
  {
    id: "evt-5",
    dotColor: "bg-primary",
    text: "Automação \"Boas-vindas\" disparada para 5 novos clientes",
    time: "há 25 min",
  },
];

export function LiveActivityFeed() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Radio className="h-4 w-4 text-emerald-400" />
        Atividade ao Vivo
      </h2>

      <ul className="mt-5 space-y-4">
        {EVENTS.map((event) => (
          <li key={event.id} className="flex items-center gap-3 text-sm">
            <span className={`h-2 w-2 shrink-0 rounded-full ${event.dotColor}`} />
            <span className="min-w-0 flex-1 truncate text-white/70">{event.text}</span>
            <span className="shrink-0 text-xs text-white/30">{event.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
