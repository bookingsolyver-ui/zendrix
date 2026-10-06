"use client";

import { useState } from "react";
import { Loader2, Power } from "lucide-react";
import { BTN_GHOST } from "@/components/dashboard/settings/ui";

// Os interruptores de UMA organização: a torneira (corta todas as funcionalidades premium), cada funcionalidade e o limite de IA.
interface Props {
  workspaceId: string;
  catalog: { id: string; label: string }[];
  flags: { flag: string; enabled: boolean }[];
  aiLimit: number;
  hasOverride: boolean;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  return Boolean(res?.ok);
}

export function TenantControls({ workspaceId, catalog, flags, aiLimit, hasOverride }: Props) {
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(flags.map((f) => [f.flag, f.enabled])));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [limit, setLimit] = useState(String(aiLimit));

  const isOn = (flag: string) => state[flag] ?? true;
  const tapOff = state["*"] === false;

  async function toggle(flag: string, enabled: boolean) {
    if (flag === "*" && !enabled && !window.confirm("Cortar a torneira? Todas as funcionalidades premium desta organização ficam desligadas já.")) return;
    setBusy(flag);
    setError(false);
    const ok = await post("/api/super-admin/flags", { workspaceId, flag, enabled });
    setBusy(null);
    if (ok) setState((s) => ({ ...s, [flag]: enabled }));
    else setError(true);
  }

  async function saveLimit(value: number | null) {
    setBusy("quota");
    setError(!(await post("/api/super-admin/quota", { workspaceId, dailyLimit: value })));
    setBusy(null);
  }

  return (
    <div className="space-y-3 px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy === "*"} onClick={() => toggle("*", tapOff)} className={`${BTN_GHOST} flex items-center gap-2 ${tapOff ? "border-danger text-danger" : ""}`}>
          {busy === "*" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          {tapOff ? "Torneira CORTADA: reabrir" : "Cortar torneira"}
        </button>
        <span className="text-xs text-muted">{tapOff ? "Todas as funcionalidades premium estão desligadas." : "Corta de uma vez todas as funcionalidades abaixo."}</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {catalog.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
            <span>{f.label}</span>
            <button type="button" role="switch" aria-checked={isOn(f.id) && !tapOff} aria-label={f.label} disabled={busy === f.id || tapOff} onClick={() => toggle(f.id, !isOn(f.id))} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${isOn(f.id) && !tapOff ? "bg-emerald-500" : "bg-white/20"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${isOn(f.id) && !tapOff ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted" htmlFor={`limit-${workspaceId}`}>Limite diário de IA</label>
        <input id={`limit-${workspaceId}`} value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-24 rounded-lg border border-border bg-surface-2 px-2 py-1" />
        <button type="button" disabled={busy === "quota" || !Number(limit)} onClick={() => saveLimit(Number(limit))} className={BTN_GHOST}>Guardar</button>
        {hasOverride && <button type="button" disabled={busy === "quota"} onClick={() => saveLimit(null)} className={BTN_GHOST}>Voltar ao global</button>}
      </div>
      {error && <p role="alert" className="text-xs text-danger">Não foi possível guardar.</p>}
    </div>
  );
}
