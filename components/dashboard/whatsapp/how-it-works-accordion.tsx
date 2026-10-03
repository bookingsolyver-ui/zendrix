"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const ITEMS = [
  {
    title: "Conectando um número",
    content:
      "Siga o passo a passo guiado para ligar o seu número de WhatsApp Business à Zetrix através da janela oficial da Meta. Todo o processo acontece fora da Zetrix e demora apenas alguns minutos.",
  },
  {
    title: "Gerenciando um número conectado",
    content:
      "Depois de conectado, pode consultar o estado do número, trocar o número associado à API ou desconectá-lo em qualquer momento diretamente a partir desta página.",
  },
];

export function HowItWorksAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div>
      <h2 className="text-lg font-semibold">Como funciona</h2>

      <div className="mt-4 space-y-2">
        {ITEMS.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={item.title} className="glow-border overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground"
              >
                {item.title}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{item.content}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
