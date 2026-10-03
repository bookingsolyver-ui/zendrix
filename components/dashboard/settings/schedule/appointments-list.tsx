"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { CARD } from "@/components/dashboard/settings/ui";

export interface AppointmentRow {
  id: string;
  customerName: string;
  customerEmail: string | null;
  service: string | null;
  when: string; // já formatado no servidor, no fuso da organização
}

export function AppointmentsList({ appointments, canManage }: { appointments: AppointmentRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function cancel(id: string) {
    setBusy(id);
    setError(false);
    try {
      const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      if (!res.ok) setError(true);
      else router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={CARD}>
      <h2 className="text-sm font-semibold text-white">Próximas marcações</h2>
      {appointments.length === 0 ? (
        <p className="mt-4 text-sm text-white/50">Ainda não há marcações. Aparecem aqui quando a IA marcar uma.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5">
          {appointments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="block font-medium text-white capitalize">{a.when}</span>
                <span className="block text-white/60">
                  {a.customerName}
                  {a.service ? ` · ${a.service}` : ""}
                  {a.customerEmail ? ` · ${a.customerEmail}` : ""}
                </span>
              </span>
              {canManage && (
                <button type="button" disabled={busy === a.id} onClick={() => cancel(a.id)} className="text-xs text-white/40 hover:text-red-300 disabled:opacity-50">
                  {busy === a.id ? "A cancelar…" : "Cancelar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          Não foi possível cancelar. Tente novamente.
        </p>
      )}
    </div>
  );
}
