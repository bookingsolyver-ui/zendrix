"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";
import { SUB_STATUSES, SUB_STATUS_LABEL } from "@/lib/admin/schema";

export interface OrgActionsProps {
  id: string;
  name: string;
  blocked: boolean;
  blockedReason: string | null;
  subStatus: string;
  plan: string | null;
  hasStripeSubscription: boolean;
}

async function patch(id: string, body: unknown) {
  try {
    const res = await fetch(`/api/admin/organizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
    return { ok: Boolean(res.ok && data?.success), error: data?.error };
  } catch {
    return { ok: false, error: "network" as string | undefined };
  }
}

const ERRORS: Record<string, string> = { not_trialing: "Só se prolonga o teste de organizações em teste.", invalid_input: "Verifique os campos.", not_found: "Organização não encontrada." };

// Bloquear/desbloquear, alterar o plano à mão e prolongar o teste. Só recebe texto e booleanos (nunca funções).
export function OrgActions(props: OrgActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState(props.subStatus);

  async function run(key: string, body: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setError(null);
    const result = await patch(props.id, body);
    setBusy(null);
    if (result.ok) router.refresh();
    else setError(ERRORS[result.error ?? ""] ?? "Não foi possível concluir a ação.");
  }

  const onBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "");
    void run("block", { action: "block", reason }, `Suspender «${props.name}»? A organização perde o acesso e os envios param de imediato.`);
  };
  const onSubscription = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const plan = String(data.get("plan") ?? "").trim();
    const days = Number(data.get("trialDays"));
    void run("sub", { action: "set_subscription", subStatus, plan: plan || null, ...(subStatus === "trialing" ? { trialDays: days > 0 ? days : 14 } : {}) }, `Alterar a subscrição de «${props.name}» para «${SUB_STATUS_LABEL[subStatus]}»?`);
  };
  const onExtend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const days = Number(new FormData(event.currentTarget).get("days"));
    void run("extend", { action: "extend_trial", days });
  };

  return (
    <div className="space-y-6">
      <div className={CARD}>
        <h2 className="text-sm font-semibold text-white">Acesso</h2>
        {props.blocked ? (
          <>
            <p className="mt-2 text-sm text-red-300">Organização suspensa{props.blockedReason ? `: ${props.blockedReason}` : "."}</p>
            <button type="button" disabled={busy === "block"} onClick={() => void run("unblock", { action: "unblock" }, `Reativar o acesso de «${props.name}»?`)} className={`${BTN_PRIMARY} mt-4`}>
              {busy === "unblock" && <Loader2 className="h-4 w-4 animate-spin" />}
              Desbloquear
            </button>
          </>
        ) : (
          <form onSubmit={onBlock} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input name="reason" required minLength={3} maxLength={200} placeholder="Motivo da suspensão (fica registado)" aria-label="Motivo" className={`${INPUT} flex-1`} />
            <button type="submit" disabled={busy === "block"} className="rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60">
              {busy === "block" && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              Bloquear
            </button>
          </form>
        )}
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-white">Subscrição (alteração manual)</h2>
        {props.hasStripeSubscription && <p className="mt-2 text-xs text-amber-300">Esta organização tem uma subscrição no Stripe: o próximo evento do Stripe volta a ser a fonte da verdade e pode repor o estado.</p>}
        <form onSubmit={onSubscription} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto]">
          <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} aria-label="Estado" className={`${INPUT} bg-[#111]`}>
            {SUB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SUB_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <input name="plan" defaultValue={props.plan ?? ""} maxLength={40} placeholder="Plano (opcional)" aria-label="Plano" className={INPUT} />
          <input name="trialDays" type="number" min={1} max={90} defaultValue={14} disabled={subStatus !== "trialing"} aria-label="Dias de teste" className={INPUT} />
          <button type="submit" disabled={busy === "sub"} className={BTN_PRIMARY}>
            {busy === "sub" && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar
          </button>
        </form>

        {props.subStatus === "trialing" && (
          <form onSubmit={onExtend} className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
            <span className="text-sm text-white/60">Prolongar o teste em</span>
            <input name="days" type="number" min={1} max={90} defaultValue={7} aria-label="Dias a somar" className={`${INPUT} w-24`} />
            <span className="text-sm text-white/60">dias</span>
            <button type="submit" disabled={busy === "extend"} className={BTN_GHOST}>
              Prolongar
            </button>
          </form>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
