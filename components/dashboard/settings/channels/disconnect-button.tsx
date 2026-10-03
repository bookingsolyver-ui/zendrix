"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const ERRORS: Record<string, string> = {
  forbidden: "Sem permissão.",
  rate_limited: "Demasiadas tentativas. Aguarde um pouco.",
  not_found: "Este canal já não existe.",
};

// Desligar em dois passos (um clique acidental não apaga as credenciais): "Desligar" -> "Confirmar".
export function DisconnectButton({ integrationId }: { integrationId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${integrationId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível desligar. Tente novamente.");
        setPending(false);
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
      setPending(false);
      setConfirming(false);
    }
  }

  if (pending) return <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" aria-label="A desligar" />;

  return (
    <span className="inline-flex items-center gap-2">
      {confirming ? (
        <>
          <button type="button" onClick={disconnect} className="text-xs font-medium text-red-300 hover:text-red-200">
            Confirmar
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-xs text-white/40 hover:text-white/70">
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="text-xs text-white/40 hover:text-red-300">
          Desligar
        </button>
      )}
      {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    </span>
  );
}
