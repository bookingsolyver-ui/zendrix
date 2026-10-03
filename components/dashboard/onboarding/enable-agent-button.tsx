"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const ERRORS: Record<string, string> = {
  profile_incomplete: "Preencha primeiro o nome comercial e a descrição na ficha do negócio.",
  subscription_required: "Ative o seu plano para ligar a IA.",
  forbidden: "Apenas o proprietário ou um gestor pode ligar a IA.",
};

// "Ligar a IA" num clique (o último passo do onboarding). O servidor volta a verificar a ficha e o plano.
export function EnableAgentButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/business-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentEnabled: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível ligar a IA. Tente novamente.");
        return;
      }
      router.refresh();
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={enable}
        disabled={pending}
        className="neon-btn flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        Ligar a IA
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-xs text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
