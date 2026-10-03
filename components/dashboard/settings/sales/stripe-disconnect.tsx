"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST } from "@/components/dashboard/settings/ui";

export function StripeDisconnectButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function disconnect() {
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/stripe/connect/disconnect", { method: "POST" });
      if (!res.ok) setError(true);
      else router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      {confirming ? (
        <>
          <button type="button" disabled={pending} onClick={disconnect} className="text-sm font-medium text-red-300 hover:text-red-200">
            {pending ? "A desligar…" : "Confirmar: a IA deixa de enviar links"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-sm text-white/40 hover:text-white/70">Cancelar</button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={BTN_GHOST}>Desligar Stripe</button>
      )}
      {error && <span role="alert" className="text-sm text-red-300">Não foi possível desligar.</span>}
    </span>
  );
}
