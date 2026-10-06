"use client";

import { useEffect, useState } from "react";
import { GitMerge, Loader2, Search, X } from "lucide-react";
import { BTN_GHOST, BTN_PRIMARY, CARD } from "@/components/dashboard/settings/ui";
import { callApi } from "@/lib/client/api";

// Data-Cleaner: rever pares de clientes que parecem ser a mesma pessoa. Fundir junta notas, receita e conversas no registo
// mais antigo; o outro não é apagado. Só proprietários e gestores.

interface Side { id: string; name: string | null; waId: string; email: string | null; leadStage: string; createdAt: string }
interface Candidate { id: string; score: number; reasons: string[]; primary: Side; duplicate: Side }

const Card = ({ side, label }: { side: Side; label: string }) => (
  <div className="min-w-0 flex-1 rounded-xl border border-border p-3 text-sm">
    <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    <p className="mt-1 truncate font-medium">{side.name ?? "Sem nome"}</p>
    <p className="text-muted">+{side.waId}</p>
    <p className="truncate text-muted">{side.email ?? "sem e-mail"}</p>
    <p className="mt-1 text-xs text-muted">{side.leadStage} · criado em {side.createdAt.slice(0, 10)}</p>
  </div>
);

export function DuplicatesPanel() {
  const [items, setItems] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  const reload = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    fetch("/api/data-cleaner/candidates", { cache: "no-store" })
      .then(async (res) => ((await res.json().catch(() => null)) as { candidates?: Candidate[] } | null)?.candidates ?? (res.ok ? [] : []))
      .catch(() => [] as Candidate[])
      .then((list) => alive && setItems(list));
    return () => { alive = false; };
  }, [tick]);

  async function act(id: string, kind: "merge" | "dismiss") {
    if (kind === "merge" && !window.confirm("Fundir estes dois registos? O mais recente fica marcado como fundido (não é apagado).")) return;
    setBusy(id);
    const result = await callApi(`/api/data-cleaner/${kind}`, "POST", { candidateId: id });
    setBusy(null);
    setMessage(result.ok ? (kind === "merge" ? "Registos fundidos." : "Par dispensado.") : "Não foi possível concluir. Atualize e tente de novo.");
    reload();
  }

  async function scan() {
    setBusy("scan");
    const result = await callApi("/api/data-cleaner/scan", "POST");
    setBusy(null);
    setMessage(result.ok ? "Procura concluída." : "Não foi possível procurar.");
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{items === null ? "A carregar..." : `${items.length} par(es) por rever`}</p>
        <button type="button" onClick={scan} disabled={busy === "scan"} className={BTN_GHOST}>
          {busy === "scan" ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Search className="mr-2 inline h-4 w-4" />}Procurar agora
        </button>
      </div>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      {items?.map((c) => (
        <div key={c.id} className={CARD}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Card side={c.primary} label="Manter" />
            <Card side={c.duplicate} label="Fundir neste" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{Math.round(c.score * 100)}% parecidos · {(c.reasons as string[]).join(", ")}</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "dismiss")} className={BTN_GHOST}><X className="mr-1 inline h-4 w-4" />Não são iguais</button>
              <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "merge")} className={BTN_PRIMARY}><GitMerge className="h-4 w-4" />Fundir</button>
            </div>
          </div>
        </div>
      ))}
      {items?.length === 0 && <p className="text-sm text-muted">Sem duplicados por rever.</p>}
    </div>
  );
}
