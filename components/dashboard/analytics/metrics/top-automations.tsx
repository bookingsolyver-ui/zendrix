import { Gift, PartyPopper, ShoppingCart } from "lucide-react";

const TOP_AUTOMATIONS = [
  {
    icon: ShoppingCart,
    name: "Recuperação de Carrinho (WhatsApp)",
    interactions: "4.820 interações",
  },
  {
    icon: PartyPopper,
    name: "Boas-vindas a Novos Clientes",
    interactions: "3.150 interações",
  },
  {
    icon: Gift,
    name: "Cupão de Aniversário",
    interactions: "1.940 interações",
  },
];

export function TopAutomations() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Top Automations</h2>
      <p className="mt-1 text-xs text-white/40">Os fluxos que geram mais interação.</p>

      <div className="mt-5 space-y-3">
        {TOP_AUTOMATIONS.map((automation, index) => {
          const Icon = automation.icon;

          return (
            <div
              key={automation.name}
              className="flex items-center gap-4 rounded-xl border border-white/5 bg-black/20 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/60">
                {index + 1}
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Icon className="h-4 w-4 text-emerald-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{automation.name}</p>
                <p className="text-xs text-white/40">{automation.interactions}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
