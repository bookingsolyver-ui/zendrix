import { BellOff, Sparkles, Trophy, Users } from "lucide-react";

// Números reais da base de contactos, calculados no servidor.
export function ContactsStats({ total, newThisWeek, customers, optedOut }: { total: number; newThisWeek: number; customers: number; optedOut: number }) {
  const stats = [
    { icon: Users, label: "Total de contactos", value: total, hint: "Todas as plataformas" },
    { icon: Sparkles, label: "Novos (7 dias)", value: newThisWeek, hint: "Criados esta semana" },
    { icon: Trophy, label: "Clientes", value: customers, hint: "Com pagamento confirmado" },
    { icon: BellOff, label: "Sem automáticas", value: optedOut, hint: "Pediram para não receber" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div key={stat.label} className="glow-border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{stat.label}</span>
              <Icon className="h-4 w-4 text-neon-green" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">{stat.value.toLocaleString("pt-PT")}</p>
            <p className="mt-1 text-xs text-muted">{stat.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
