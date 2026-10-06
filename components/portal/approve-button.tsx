"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

// O grande botão «Aprovar» do portal. O clique é um POST explícito (ver o link nunca aprova nada).
export function ApproveButton({ token, labels }: { token: string; labels: { confirm: string; approve: string; done: string; failed: string } }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [checked, setChecked] = useState(false);

  async function approve() {
    setState("busy");
    try {
      const res = await fetch("/api/portal/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, confirm: true }) });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-5 text-lg font-semibold text-emerald-300">
        <CheckCircle2 className="h-6 w-6" />{labels.done}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-5 w-5" />
        {labels.confirm}
      </label>
      <button type="button" disabled={!checked || state === "busy"} onClick={approve} className="neon-btn flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-5 text-lg font-bold uppercase tracking-wide text-background disabled:cursor-not-allowed disabled:opacity-50">
        {state === "busy" && <Loader2 className="h-5 w-5 animate-spin" />}{labels.approve}
      </button>
      {state === "failed" && <p role="alert" className="text-center text-sm text-danger">{labels.failed}</p>}
    </div>
  );
}
