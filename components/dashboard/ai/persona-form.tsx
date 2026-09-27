"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

const TONE_OPTIONS = ["Profissional", "Amigável", "Agressivo em Vendas"] as const;

export function PersonaForm() {
  const [name, setName] = useState("");
  const [tone, setTone] = useState<(typeof TONE_OPTIONS)[number]>("Profissional");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="glow-border rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
          <Sparkles className="h-4 w-4 text-neon-green" />
        </span>
        <h2 className="text-base font-semibold">Persona</h2>
      </div>

      <form className="mt-6 space-y-5" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label htmlFor="assistant-name" className="text-sm font-medium text-foreground">
            Nome do Assistente
          </label>
          <input
            id="assistant-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Sofia"
            className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="assistant-tone" className="text-sm font-medium text-foreground">
            Tom de voz
          </label>
          <select
            id="assistant-tone"
            value={tone}
            onChange={(event) => setTone(event.target.value as (typeof TONE_OPTIONS)[number])}
            className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assistant-prompt" className="text-sm font-medium text-foreground">
            Prompt Principal / Regras de Ouro
          </label>
          <textarea
            id="assistant-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={10}
            placeholder="Ex: Nunca prometa prazos de entrega. Responda sempre em português. Ofereça o plano Pro quando o cliente perguntar por preços..."
            className="mt-2 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          className="neon-btn w-full rounded-full px-5 py-2.5 text-sm font-semibold text-background sm:w-auto"
        >
          Guardar Persona
        </button>
      </form>
    </div>
  );
}
