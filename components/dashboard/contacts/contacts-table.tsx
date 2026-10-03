"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { visibleName } from "@/lib/inbox/display";

export type ContactRow = {
  id: string;
  name: string | null;
  phone: string;
  registeredAt: string; // already formatted on the server, so server and client render the same text
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
  const [query, setQuery] = useState("");

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
    const header = ["Nome", "Telemóvel", "Data de Registo"];
    const rows = filtered.map((contact) => [
      visibleName(contact.name) ?? "",
      contact.phone,
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
                <td className="px-5 py-4 text-muted">{contact.registeredAt}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-muted">
                  {contacts.length === 0
                    ? "Ainda não há contactos. Os clientes que escreverem para o seu WhatsApp aparecem aqui automaticamente."
                    : "Nenhum contacto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
