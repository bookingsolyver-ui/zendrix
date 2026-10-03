"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

// «Ativar» / «Suspender» a subscrição de uma organização, direto na lista. Só recebe texto.
export function SubscriptionToggle({ id, name, subStatus }: { id: string; name: string; subStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = subStatus === "active";

  async function run() {
    const text = active ? `Suspender a subscrição de «${name}»? Perde o acesso de imediato.` : `Ativar a subscrição de «${name}»? Fica com acesso de imediato.`;
    if (!window.confirm(text)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/organizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: active ? "suspend_subscription" : "activate_subscription" }) });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <button type="button" disabled={busy} onClick={() => void run()} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${active ? "border-red-500/40 text-red-300 hover:bg-red-500/10" : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"}`}>
      {busy && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
      {active ? "Suspender" : "Ativar"}
    </button>
  );
}
