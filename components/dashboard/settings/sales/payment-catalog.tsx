"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";
import { CURRENCIES } from "@/lib/payments/catalog";

export interface ItemRow {
  id: string;
  name: string;
  description: string | null;
  amountInput: string; // "29.90", para o campo de edição
  amountLabel: string; // "29,90 €", já formatado
  currency: string;
  active: boolean;
}

const ERRORS: Record<string, string> = {
  invalid_input: "Verifique o nome e o valor (mínimo 0,50).",
  too_many_items: "O catálogo está cheio (máximo 25 itens).",
  forbidden: "Sem permissão.",
};

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  return { ok: res.ok && data?.success, error: data?.error as string | undefined };
}

// O catálogo do que a IA pode vender. O valor que a IA diz ao cliente vem sempre daqui, nunca do modelo.
export function PaymentCatalog({ items, canManage }: { items: ItemRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(ERRORS[result.error ?? ""] ?? "Não foi possível guardar. Tente novamente.");
      else {
        setEditing(null);
        router.refresh();
      }
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  const readForm = (event: FormEvent<HTMLFormElement>) => {
    const data = new FormData(event.currentTarget);
    return { name: data.get("name"), description: data.get("description") || undefined, amount: data.get("amount"), currency: data.get("currency") };
  };

  const fields = (item?: ItemRow) => (
    <div className="grid gap-3 sm:grid-cols-[1.2fr_1.5fr_8rem_6rem]">
      <input name="name" required maxLength={80} defaultValue={item?.name} placeholder="Nome (ex.: Consulta inicial)" aria-label="Nome" className={INPUT} />
      <input name="description" maxLength={200} defaultValue={item?.description ?? ""} placeholder="Descrição (opcional)" aria-label="Descrição" className={INPUT} />
      <input name="amount" required defaultValue={item?.amountInput} placeholder="29,90" inputMode="decimal" aria-label="Valor" className={INPUT} />
      <select name="currency" defaultValue={item?.currency ?? "EUR"} aria-label="Moeda" className={`${INPUT} bg-[#111]`}>
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold text-white">Catálogo</h2>
      <p className="mt-1 text-sm text-white/50">
        O que a IA pode vender com um link de pagamento. Ela só vende estes itens, ao valor aqui definido: nunca inventa preços nem faz descontos.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">Ainda não há itens. Sem itens, a IA não envia links de pagamento.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {items.map((item) =>
            editing === item.id ? (
              <li key={item.id} className="py-3">
                <form onSubmit={(e) => { e.preventDefault(); const body = readForm(e); void run(item.id, () => call(`/api/payment-items/${item.id}`, "PATCH", body)); }} className="space-y-3">
                  {fields(item)}
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy === item.id} className={BTN_PRIMARY}>
                      {busy === item.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      Guardar
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={BTN_GHOST}>Cancelar</button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className={item.active ? "" : "opacity-50"}>
                  <span className="block font-medium text-white">{item.name}</span>
                  <span className="block text-white/60">
                    {item.amountLabel}
                    {item.description ? ` · ${item.description}` : ""}
                    {!item.active ? " · desativado" : ""}
                  </span>
                </span>
                {canManage && (
                  <span className="flex items-center gap-3 text-xs">
                    <button type="button" onClick={() => setEditing(item.id)} className="text-white/50 hover:text-white">Editar</button>
                    <button type="button" disabled={busy === item.id} onClick={() => run(item.id, () => call(`/api/payment-items/${item.id}`, "PATCH", { active: !item.active }))} className="text-white/50 hover:text-white">
                      {item.active ? "Desativar" : "Ativar"}
                    </button>
                    <button type="button" disabled={busy === item.id} onClick={() => { if (window.confirm(`Apagar «${item.name}»? Os links já enviados continuam a funcionar.`)) void run(item.id, () => call(`/api/payment-items/${item.id}`, "DELETE")); }} className="text-white/50 hover:text-red-300">
                      Apagar
                    </button>
                  </span>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {canManage && (
        <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const body = readForm(e); void run("new", async () => { const r = await call("/api/payment-items", "POST", body); if (r.ok) form.reset(); return r; }); }} className="mt-5 space-y-3 border-t border-white/10 pt-5">
          <p className="text-sm font-medium text-white">Adicionar item</p>
          {fields()}
          <button type="submit" disabled={busy === "new"} className={`${BTN_PRIMARY} !px-4`}>
            {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
