import { Bot } from "lucide-react";
import { ToggleSwitch } from "@/components/dashboard/ai/settings/toggle-switch";

export function SettingsHeader({
  aiActive,
  onToggleActive,
}: {
  aiActive: boolean;
  onToggleActive: (value: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-10 mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/60 p-5 shadow-lg shadow-black/40 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
          <Bot className="h-5 w-5 text-emerald-400" />
        </span>
        <h1 className="text-lg font-semibold text-white">Configuração do Assistente IA</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <ToggleSwitch checked={aiActive} onChange={onToggleActive} />
          <span
            className={`text-sm font-medium ${aiActive ? "text-emerald-400" : "text-white/40"}`}
          >
            IA Ativa
          </span>
        </div>

        <button
          type="button"
          className="neon-green-btn rounded-full bg-green-500 px-5 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
        >
          Guardar Alterações
        </button>
      </div>
    </div>
  );
}
