"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { GlassCard } from "@/components/dashboard/ai/settings/glass-card";
import { Field, fieldInputClassName } from "@/components/dashboard/ai/settings/field";

const TONES = ["Acolhedor", "Direto", "Persuasivo"];

export function PersonaCard({
  assistantName,
  onNameChange,
}: {
  assistantName: string;
  onNameChange: (value: string) => void;
}) {
  const [audience, setAudience] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tone, setTone] = useState(TONES[0]);

  return (
    <GlassCard icon={Bot} title="Persona e Tom">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do Assistente">
          <input
            value={assistantName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ex: Sofia"
            className={fieldInputClassName}
          />
        </Field>
        <Field label="Público-alvo">
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Ex: Empreendedores em Angola"
            className={fieldInputClassName}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Instruções do Sistema">
          <textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            rows={6}
            placeholder="Define as regras de ouro do teu assistente. Ex: Nunca prometa prazos de entrega. Ofereça o plano Pro quando o cliente perguntar por preços..."
            className={`${fieldInputClassName} resize-none leading-relaxed`}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Tom de Voz">
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className={fieldInputClassName}
          >
            {TONES.map((option) => (
              <option key={option} value={option} className="bg-[#111]">
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </GlassCard>
  );
}
