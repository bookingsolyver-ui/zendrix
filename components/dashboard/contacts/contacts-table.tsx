"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Download, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { visibleName } from "@/lib/inbox/display";
import { LEAD_STAGE_LABEL, type LeadStageName } from "@/lib/leads/lead";

export type ContactRow = {
  id: string;
  name: string | null;
  phone: string;
  registeredAt: string; // already formatted on the server, so server and client render the same text
  email: string | null;
  stage: LeadStageName;
  optedOut: boolean;
};

const STAGE_STYLE: Record<LeadStageName, string> = {
  NEW: "bg-white/10 text-white/60",
  ENGAGED: "bg-sky-500/15 text-sky-300",
  QUALIFIED: "bg-amber-400/15 text-amber-300",
  PAYMENT_SENT: "bg-violet-500/15 text-violet-300",
  WON: "bg-emerald-500/15 text-emerald-300",
  LOST: "bg-red-500/10 text-red-300",
};

function displayName(contact: ContactRow) {
  return visibleName(contact.name) ?? contact.phone;
}

function initials(contact: ContactRow) {
  const name = visibleName(contact.name);
  if (!name) return "#";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ContactsTable({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const result = await callApi("/api/contacts", "POST", { name: String(data.get("name") ?? ""), phone: String(data.get("phone") ?? ""), email: String(data.get("email") ?? "") });
    setBusy(false);
    if (result.ok) {
      setAdding(false);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter(
      (contact) =>
        displayName(contact).toLowerCase().includes(normalized) ||
        contact.phone.replace(/\D/g, "").includes(normalized.replace(/\D/g, "") || "\u0000"),
    );
  }, [contacts, query]);

  function exportCsv() {
    const header = ["Nome", "Telemóvel", "E-mail", "Estado", "Data de Registo"];
    const rows = filtered.map((contact) => [
      visibleName(contact.name) ?? "",
      contact.phone,
      contact.email ?? "",
      LEAD_STAGE_LABEL[contact.stage],
      contact.registeredAt,
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "contactos-zentrix.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar contactos..."
            className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setError(null); setAdding(true); }} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Novo contacto
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="glow-border flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="glow-border mt-5 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Telemóvel</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Data de Registo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-2/40"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-foreground">
                      {initials(contact)}
                    </span>
                    <span className="font-medium text-foreground">{displayName(contact)}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted">{contact.phone}</td>
                <td className="px-5 py-4 text-muted">{contact.email ?? "—"}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_STYLE[contact.stage]}`}>{LEAD_STAGE_LABEL[contact.stage]}</span>
                  {contact.optedOut && <span className="ml-2 text-xs text-white/40" title="Pediu para não receber mensagens automáticas">sem automáticas</span>}
                </td>
                <td className="px-5 py-4 text-muted">{contact.registeredAt}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                  {contacts.length === 0
                    ? "Ainda não há contactos. Adicione um ou aguarde: quem escrever para o seu WhatsApp aparece aqui automaticamente."
                    : "Nenhum contacto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title="Novo contacto" onClose={() => setAdding(false)}>
          <form onSubmit={addContact} className="space-y-3">
            <input name="name" maxLength={120} placeholder="Nome (opcional)" aria-label="Nome" className={`${INPUT} w-full`} />
            <input name="phone" required inputMode="tel" placeholder="Telemóvel com indicativo: +351 912 345 678" aria-label="Telemóvel" className={`${INPUT} w-full`} />
            <input name="email" type="email" maxLength={254} placeholder="E-mail (opcional)" aria-label="E-mail" className={`${INPUT} w-full`} />
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={busy} className={BTN_PRIMARY}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
              <button type="button" onClick={() => setAdding(false)} className={BTN_GHOST}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
