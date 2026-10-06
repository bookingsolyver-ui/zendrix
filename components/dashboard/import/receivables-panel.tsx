"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";
import { callApi } from "@/lib/client/api";

// Cash-Collector: as cobranças em aberto. Os lembretes por WhatsApp saem sozinhos depois do vencimento; aqui cria-se
// a cobrança e marca-se como paga (o que pára os lembretes).

interface Receivable { id: string; contactId: string; reference: string; amountMinor: number; currency: string; dueAt: string; status: string; remindersSent: number }

export function ReceivablesPanel({ contacts }: { contacts: { id: string; label: string }[] }) {
  const [rows, setRows] = useState<Receivable[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  const load = () => setTick((n) => n + 1);

  useEffect(() => {
    let alive = true;
    fetch("/api/receivables", { cache: "no-store" })
      .then(async (res) => ((await res.json().catch(() => null)) as { receivables?: Receivable[] } | null)?.receivables ?? [])
      .catch(() => [] as Receivable[])
      .then((list) => alive && setRows(list));
    return () => { alive = false; };
  }, [tick]);
  const nameOf = (id: string) => contacts.find((c) => c.id === id)?.label ?? id;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = Number(String(data.get("amount")).replace(",", "."));
    if (!(amount > 0)) return setError("Valor inválido.");
    setBusy(true);
    setError(null);
    const result = await callApi("/api/receivables", "POST", {
      contactId: data.get("contactId"), reference: data.get("reference"), amountMinor: Math.round(amount * 100), currency: data.get("currency"), dueAt: data.get("dueAt"), paymentReference: String(data.get("paymentReference") ?? "") || undefined,
    });
    setBusy(false);
    if (result.ok) { form.reset(); void load(); } else setError(result.error === "already_exists" ? "Já existe uma cobrança com esse número de fatura." : "Verifique os campos e tente de novo.");
  }

  async function close(id: string, status: "PAID" | "CANCELLED") {
    await callApi(`/api/receivables/${id}`, "PATCH", { status });
    void load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className={`${CARD} grid gap-3 sm:grid-cols-3`}>
        <select name="contactId" required className={INPUT} aria-label="Cliente"><option value="">Cliente...</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <input name="reference" required placeholder="N.º da fatura" className={INPUT} />
        <input name="amount" required inputMode="decimal" placeholder="Valor (ex.: 150000)" className={INPUT} />
        <input name="currency" required defaultValue="AOA" maxLength={3} className={INPUT} aria-label="Moeda" />
        <input name="dueAt" required type="date" className={INPUT} aria-label="Vencimento" />
        <input name="paymentReference" placeholder="Referência de pagamento (opcional)" className={INPUT} />
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Criar cobrança</button>
          {error && <span role="alert" className="text-sm text-danger">{error}</span>}
        </div>
      </form>

      <div className="glow-border overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead><tr className="border-b border-border text-left text-muted"><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Fatura</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Vence</th><th className="px-4 py-3 font-medium">Lembretes</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="px-4 py-3">{nameOf(r.contactId)}</td>
                <td className="px-4 py-3">{r.reference}</td>
                <td className="px-4 py-3">{(r.amountMinor / 100).toLocaleString("pt-PT")} {r.currency}</td>
                <td className="px-4 py-3">{r.dueAt.slice(0, 10)}</td>
                <td className="px-4 py-3">{r.status === "PENDING" ? r.remindersSent : r.status === "PAID" ? "Paga" : "Cancelada"}</td>
                <td className="px-4 py-3 text-right">{r.status === "PENDING" && <><button type="button" onClick={() => close(r.id, "PAID")} className={BTN_GHOST}>Marcar paga</button> <button type="button" onClick={() => close(r.id, "CANCELLED")} className={BTN_GHOST}>Cancelar</button></>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Sem cobranças.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
