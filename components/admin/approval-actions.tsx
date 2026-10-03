"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";

async function patch(id: string, body: unknown) {
  try {
    const res = await fetch(`/api/admin/organizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
    return { ok: Boolean(res.ok && data?.success), error: data?.error };
  } catch {
    return { ok: false, error: "network" as string | undefined };
  }
}

// Aprovar ou rejeitar uma conta nova. Só recebe texto (nunca funções vindas do servidor).
export function ApprovalActions({ id, name, hasEmail }: { id: string; name: string; hasEmail: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [notify, setNotify] = useState(hasEmail);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "approve" | "reject", body: unknown) {
    setBusy(kind);
    setError(null);
    const result = await patch(id, body);
    setBusy(null);
    if (result.ok) router.refresh();
    else setError(result.error === "already_approved" ? "Já estava aprovada." : "Não foi possível concluir a ação.");
  }

  const onReject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    if (window.confirm(`Rejeitar o registo de «${name}»?`)) void run("reject", { action: "reject", reason });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy !== null} onClick={() => void run("approve", { action: "approve", notify })} className={BTN_PRIMARY}>
          {busy === "approve" && <Loader2 className="h-4 w-4 animate-spin" />}
          Aprovar
        </button>
        <button type="button" disabled={busy !== null} onClick={() => setRejecting((value) => !value)} className="rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60">
          Rejeitar
        </button>
        {hasEmail && (
          <label className="flex items-center gap-2 text-xs text-white/50">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-emerald-500" />
            Avisar por e-mail
          </label>
        )}
      </div>
      {rejecting && (
        <form onSubmit={onReject} className="flex flex-col gap-2 sm:flex-row">
          <input name="reason" required minLength={3} maxLength={200} placeholder="Motivo da rejeição (o cliente vê-o)" aria-label="Motivo" className={`${INPUT} flex-1`} />
          <button type="submit" disabled={busy !== null} className="rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60">
            {busy === "reject" && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            Confirmar rejeição
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
