"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ProofCard, type ProofView } from "@/components/dashboard/payments/proof-card";

// A lista de comprovativos (os por validar primeiro). Atualiza-se sozinha a cada 6 s com o separador visível.
export function ProofsPanel() {
  const [proofs, setProofs] = useState<ProofView[] | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/proofs", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error("load");
      setProofs(data.proofs);
      setCanDecide(Boolean(data.canDecide));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const kickoff = setTimeout(() => void load(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 6_000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [load]);

  if (!proofs && !failed) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-white/50" />;
  if (!proofs) return <p className="text-sm text-red-300">Não foi possível carregar os comprovativos.</p>;
  if (proofs.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">Ainda não há comprovativos. Quando um cliente enviar o comprovativo depois de receber os dados bancários, aparece aqui.</p>;
  }
  const pending = proofs.filter((p) => p.status === "PENDING").length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">{pending === 0 ? "Nada por validar." : pending === 1 ? "1 comprovativo por validar." : `${pending} comprovativos por validar.`}</p>
      {proofs.map((proof) => (
        <ProofCard key={proof.id} proof={proof} canDecide={canDecide} onDone={() => void load()} />
      ))}
    </div>
  );
}
