"use client";

import { useState, type KeyboardEvent } from "react";
import { ShieldAlert, X } from "lucide-react";
import { GlassCard } from "@/components/dashboard/ai/settings/glass-card";
import { Field } from "@/components/dashboard/ai/settings/field";
import { ToggleSwitch } from "@/components/dashboard/ai/settings/toggle-switch";

type Guardrail = {
  id: string;
  label: string;
  checked: boolean;
};

const INITIAL_GUARDRAILS: Guardrail[] = [
  { id: "block-competitors", label: "Bloquear menções a concorrentes", checked: true },
  { id: "block-medical", label: "Bloquear orientações médicas", checked: true },
  { id: "allow-price-negotiation", label: "Permitir negociação de preços", checked: false },
];

const INITIAL_TAGS = ["falar com atendente", "reclamação"];

export function GuardrailsCard() {
  const [guardrails, setGuardrails] = useState(INITIAL_GUARDRAILS);
  const [tags, setTags] = useState(INITIAL_TAGS);
  const [tagInput, setTagInput] = useState("");

  function toggleGuardrail(id: string) {
    setGuardrails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  function addTag() {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((item) => item !== tag));
  }

  return (
    <GlassCard icon={ShieldAlert} title="Proteções (Guardrails) e Handoff">
      <div className="space-y-2.5">
        {guardrails.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <span className="text-sm text-white/80">{item.label}</span>
            <ToggleSwitch checked={item.checked} onChange={() => toggleGuardrail(item.id)} size="sm" />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Field label="Palavras-chave para Transferência (Handoff)">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-2.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
              >
                [{tag}]
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remover ${tag}`}
                  className="text-emerald-300/70 hover:text-emerald-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={addTag}
              placeholder="Adicionar palavra-chave..."
              className="min-w-[120px] flex-1 bg-transparent py-1 text-xs text-white outline-none placeholder:text-white/30"
            />
          </div>
        </Field>
      </div>
    </GlassCard>
  );
}
