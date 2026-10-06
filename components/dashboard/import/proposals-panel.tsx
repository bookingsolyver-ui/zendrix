"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, Loader2 } from "lucide-react";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";
import { formatMoney } from "@/lib/cash/dunning";

// Zetrix Portal (lado do gestor): cria uma proposta e o link mágico para o cliente aprovar no telemóvel.
interface Row { id: string; contactId: string; title: string; amountMinor: number; currency: string; status: string; tokenExpiresAt: string }
const WHATSAPP: Record<string, string> = { sent: "Enviado por WhatsApp.", window_closed: "Fora da janela de 24 h do WhatsApp: copie o link e envie à mão.", no_conversation: "Sem conversa com este cliente: copie o link e envie à mão.", failed: "Não foi possível enviar por WhatsApp: copie o link.", not_requested: "" };

export function ProposalsPanel({ contacts }: { contacts: { id: string; label: string }[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; note: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/proposals", { cache: "no-store" })
      .then(async (res) => (res.ok ? (((await res.json()) as { proposals: Row[] }).proposals) : []))
      .catch(() => [] as Row[])
      .then((list) => alive && setRows(list));
    return () => { alive = false; };
  }, [tick]);
  const nameOf = (id: string) => contacts.find((c) => c.id === id)?.label ?? id;

  async function submit(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { success?: boolean; url?: string; whatsapp?: string } | null;
    setBusy(false);
    if (res?.ok && data?.success && data.url) { setLink({ url: data.url, note: WHATSAPP[data.whatsapp ?? "not_requested"] ?? "" }); setTick((n) => n + 1); return true; }
    setError("Não foi possível concluir. Verifique os campos.");
    return false;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const d = new FormData(form);
    const price = Number(String(d.get("price")).replace(",", "."));
    if (!(price >= 0)) return setError("Preço inválido.");
    const ok = await submit("/api/proposals", { contactId: d.get("contactId"), title: d.get("title"), currency: d.get("currency"), sendWhatsApp: d.get("send") === "on", lines: [{ description: String(d.get("description")), quantity: Number(d.get("quantity")) || 1, unitMinor: Math.round(price * 100) }] });
    if (ok) form.reset();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className={`${CARD} grid gap-3 sm:grid-cols-3`}>
        <select name="contactId" required className={INPUT} aria-label="Cliente"><option value="">Cliente...</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <input name="title" required placeholder="Título da proposta" className={INPUT} />
        <input name="currency" required defaultValue="AOA" maxLength={3} className={INPUT} aria-label="Moeda" />
        <input name="description" required placeholder="Item (ex.: Licença anual)" className={`${INPUT} sm:col-span-1`} />
        <input name="quantity" type="number" min={1} defaultValue={1} className={INPUT} aria-label="Quantidade" />
        <input name="price" required inputMode="decimal" placeholder="Preço unitário" className={INPUT} />
        <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2"><input type="checkbox" name="send" /> Enviar o link por WhatsApp (se a janela de 24 h estiver aberta)</label>
        <div className="flex items-center gap-3"><button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Criar e gerar link</button></div>
        {error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}
      </form>

      {link && (
        <div role="status" className={`${CARD} space-y-2`}>
          <p className="text-sm font-medium">Link gerado (só aparece agora; para outro, gere um novo):</p>
          <div className="flex items-center gap-2"><input readOnly value={link.url} className={`${INPUT} min-w-0 flex-1`} onFocus={(e) => e.currentTarget.select()} /><button type="button" className={BTN_GHOST} onClick={() => void navigator.clipboard?.writeText(link.url)}><Copy className="h-4 w-4" /></button></div>
          {link.note && <p className="text-xs text-muted">{link.note}</p>}
        </div>
      )}

      <div className="glow-border overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead><tr className="border-b border-border text-left text-muted"><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Proposta</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {rows.map((r) => {
              const expired = r.status === "SENT" && new Date(r.tokenExpiresAt) < new Date();
              return (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="px-4 py-3">{nameOf(r.contactId)}</td><td className="px-4 py-3">{r.title}</td><td className="px-4 py-3">{formatMoney(r.amountMinor, r.currency)}</td>
                  <td className="px-4 py-3">{r.status === "APPROVED" ? "Aprovada" : expired ? "Link expirado" : "Enviada"}</td>
                  <td className="px-4 py-3 text-right">{r.status === "SENT" && <button type="button" disabled={busy} className={BTN_GHOST} onClick={() => submit(`/api/proposals/${r.id}/link`, {})}>Novo link</button>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Sem propostas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
