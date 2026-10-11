"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";

export interface ProofView {
  id: string;
  conversationId: string;
  contact: string;
  itemName: string | null;
  amountLabel: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  mimeType: string | null;
  fileUrl: string | null;
}

const ERRORS: Record<string, string> = {
  not_pending: "Este comprovativo já foi decidido por outra pessoa.",
  not_found: "Este comprovativo já não existe.",
  rate_limited: "Demasiadas ações seguidas. Aguarde um instante.",
  forbidden: "Apenas o proprietário ou um gestor pode decidir.",
};

const STATUS: Record<ProofView["status"], { label: string; tone: string }> = {
  PENDING: { label: "Por validar", tone: "bg-amber-400/15 text-amber-300" },
  APPROVED: { label: "Pagamento concluído", tone: "bg-emerald-500/15 text-emerald-300" },
  REJECTED: { label: "Rejeitado", tone: "bg-red-500/15 text-red-300" },
};

const when = (iso: string) => new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Um comprovativo com o ficheiro anexado e os botões de aprovação rápida. Aprovar muda o estado para «Pagamento concluído»
// e envia a confirmação ao cliente no WhatsApp; rejeitar pede-lhe outro comprovativo (com o motivo, se o escrever).
export function ProofCard({ proof, canDecide, onDone, compact = false }: { proof: ProofView; canDecide: boolean; onDone: () => void; compact?: boolean }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isImage = proof.mimeType?.startsWith("image/") ?? false;

  async function decide(action: "approve" | "reject") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/payments/proofs/${proof.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { action, note } : { action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível guardar a decisão. Tente novamente.");
        if (data?.error === "not_pending") onDone();
        return;
      }
      onDone();
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  const status = STATUS[proof.status];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{proof.contact}</p>
          <p className="text-xs text-white/50">
            {proof.itemName ?? "Pagamento por transferência"}
            {proof.amountLabel ? ` · ${proof.amountLabel}` : ""} · {when(proof.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.tone}`}>{status.label}</span>
      </div>

      <div className={`mt-3 ${compact ? "" : "sm:flex sm:gap-4"}`}>
        {proof.fileUrl ? (
          isImage ? (
            <a href={proof.fileUrl} target="_blank" rel="noreferrer" className="block shrink-0">
              {/* URL temporário do Storage: não passa pelo otimizador de imagens. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proof.fileUrl} alt="Comprovativo de pagamento" className={`rounded-xl border border-white/10 bg-black/30 object-cover ${compact ? "h-28" : "h-40 w-40"}`} />
            </a>
          ) : (
            <a href={proof.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80 hover:bg-white/5">
              <FileText className="h-4 w-4" /> Abrir documento
            </a>
          )
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-white/40">Ficheiro indisponível aqui: veja-o na conversa, no telemóvel.</p>
        )}

        <div className="mt-3 min-w-0 flex-1 space-y-2 sm:mt-0">
          {proof.status === "REJECTED" && proof.note && <p className="text-xs text-red-300">Motivo: {proof.note}</p>}
          {proof.status === "PENDING" && canDecide && (
            <>
              {rejecting ? (
                <div className="space-y-2">
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Motivo (opcional, vai ao cliente)" aria-label="Motivo da rejeição" className={`${INPUT} w-full`} />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy !== null} onClick={() => void decide("reject")} className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Rejeitar
                    </button>
                    <button type="button" disabled={busy !== null} onClick={() => setRejecting(false)} className={BTN_GHOST}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy !== null} onClick={() => void decide("approve")} className={`${BTN_PRIMARY} inline-flex items-center gap-2`}>
                    {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Aprovar pagamento
                  </button>
                  <button type="button" disabled={busy !== null} onClick={() => setRejecting(true)} className={BTN_GHOST}>Rejeitar</button>
                </div>
              )}
              <p className="text-xs text-white/40">Ao aprovar, o cliente recebe a confirmação no WhatsApp e a IA volta a responder.</p>
            </>
          )}
          {proof.status === "PENDING" && !canDecide && <p className="text-xs text-white/40">À espera de um gestor.</p>}
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
