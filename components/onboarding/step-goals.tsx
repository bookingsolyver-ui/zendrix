import { BellRing, Megaphone, RotateCcw, ShoppingCart, Sparkles, Users } from "lucide-react";
import { SelectableCard } from "@/components/onboarding/selectable-card";

const GOALS = [
  { value: "carrinhos-abandonados", label: "Carrinhos abandonados", icon: ShoppingCart },
  { value: "notificacao-pedidos", label: "Notificação de pedidos", icon: BellRing },
  { value: "recuperacao-pedidos", label: "Recuperação de pedidos", icon: RotateCcw },
  { value: "atendimento-equipe", label: "Atendimento com a equipe", icon: Users },
  { value: "campanhas-promocoes", label: "Campanhas e promoções", icon: Megaphone },
  { value: "atendimento-ia", label: "Atendimento com IA", icon: Sparkles },
];

export function StepGoals({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        O que você quer fazer com o WhatsApp?
      </h1>
      <p className="mt-2 text-sm text-muted">Selecione todas as opções que se aplicam.</p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GOALS.map((goal) => (
          <SelectableCard
            key={goal.value}
            icon={goal.icon}
            label={goal.label}
            selected={value.includes(goal.value)}
            onClick={() => onToggle(goal.value)}
          />
        ))}
      </div>
    </div>
  );
}
