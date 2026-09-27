"use client";

import { useState } from "react";
import { Check, Mic, Phone, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Addon = {
  id: string;
  icon: LucideIcon;
  title: string;
  price: string;
  description: string;
};

const ADDONS: Addon[] = [
  {
    id: "whatsapp-number",
    icon: Phone,
    title: "Número adicional de WhatsApp",
    price: "Kz 7.000 / $10 por mês",
    description: "Adicione uma linha extra para atender mais clientes em simultâneo.",
  },
  {
    id: "ai-voice-minutes",
    icon: Mic,
    title: "Minutos de voz IA extras",
    price: "Kz 5.000 / $7 por mês",
    description: "500 minutos adicionais de respostas por voz do seu assistente de IA.",
  },
  {
    id: "crm-seat",
    icon: UserPlus,
    title: "Vaga adicional de CRM",
    price: "Kz 3.500 / $5 por mês",
    description: "Adicione mais um membro de equipa com acesso ao CRM e ao Inbox.",
  },
];

export function AddonsSection() {
  const [added, setAdded] = useState<Record<string, boolean>>({});

  function toggleAddon(id: string) {
    setAdded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Add-ons</h2>
      <p className="mt-1 text-sm text-muted">
        Expanda o seu plano com extras avulso, cobrados junto com a sua fatura mensal.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADDONS.map((addon) => {
          const Icon = addon.icon;
          const isAdded = Boolean(added[addon.id]);

          return (
            <div key={addon.id} className="glow-border flex flex-col rounded-2xl p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Icon className={`h-5 w-5 ${isAdded ? "text-neon-green" : "text-muted"}`} />
              </span>

              <h3 className="mt-4 text-sm font-semibold">{addon.title}</h3>
              <p className="neon-green-text mt-1 text-sm font-semibold">{addon.price}</p>
              <p className="mt-2 flex-1 text-sm text-muted">{addon.description}</p>

              <button
                type="button"
                onClick={() => toggleAddon(addon.id)}
                aria-pressed={isAdded}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isAdded
                    ? "border border-neon-green/50 bg-neon-green/10 text-neon-green"
                    : "neon-btn text-background"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4" />
                    Adicionado
                  </>
                ) : (
                  "Adicionar"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
