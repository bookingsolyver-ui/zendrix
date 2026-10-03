import { Inbox, MessageCircle, Send, Users } from "lucide-react";
import type { OverviewStats } from "@/lib/overview/stats";

const fmt = new Intl.NumberFormat("pt-PT");

// Os números do mês, em cartões. Só dados reais da organização.
export function OverviewStatsCards({ stats }: { stats: OverviewStats }) {
  const items = [
    { icon: Users, label: "Conversas", value: stats.conversations, hint: "No total" },
    { icon: Inbox, label: "Por responder", value: stats.awaitingReply, hint: "Com mensagens por ler", highlight: stats.awaitingReply > 0 },
    { icon: MessageCircle, label: "Recebidas", value: stats.receivedThisMonth, hint: "Este mês" },
    { icon: Send, label: "Enviadas", value: stats.sentThisMonth, hint: "Este mês, por si e pela IA" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ icon: Icon, label, value, hint, highlight }) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Icon className={`h-4 w-4 ${highlight ? "text-emerald-400" : "text-white/60"}`} />
          </span>
          <p className="mt-4 text-2xl font-semibold text-white">{fmt.format(value)}</p>
          <p className="mt-0.5 text-sm text-white/70">{label}</p>
          <p className="text-xs text-white/40">{hint}</p>
        </div>
      ))}
    </div>
  );
}
