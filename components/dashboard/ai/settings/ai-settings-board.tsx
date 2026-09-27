"use client";

import { useState } from "react";
import { SettingsHeader } from "@/components/dashboard/ai/settings/settings-header";
import { PersonaCard } from "@/components/dashboard/ai/settings/persona-card";
import { GuardrailsCard } from "@/components/dashboard/ai/settings/guardrails-card";
import { KnowledgeCard } from "@/components/dashboard/ai/settings/knowledge-card";
import { PreviewCard } from "@/components/dashboard/ai/settings/preview-card";

export function AiSettingsBoard() {
  const [assistantName, setAssistantName] = useState("");
  const [aiActive, setAiActive] = useState(true);

  return (
    <div>
      <SettingsHeader aiActive={aiActive} onToggleActive={setAiActive} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PersonaCard assistantName={assistantName} onNameChange={setAssistantName} />
          <GuardrailsCard />
        </div>

        <div className="space-y-6">
          <KnowledgeCard />
          <PreviewCard assistantName={assistantName} />
        </div>
      </div>
    </div>
  );
}
