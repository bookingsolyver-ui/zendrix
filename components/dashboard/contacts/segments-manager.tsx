"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { LEAD_STAGES, stageText, type LeadStageValue, type SegmentRules } from "@/lib/segments/rules";

export interface SegmentRow {
  id: string | null; // null = lista predefinida (só leitura)
  name: string;
  type: "Lista" | "Dinâmico";
  description: string;
  note: string; // nota livre do segmento (só os próprios)
  members: number;
  rules: SegmentRules | null;
}

const TRI_OPTIONS = [
  { value: "any", label: "Indiferente" },
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
];

// Segmentos: as listas predefinidas (só leitura) e os segmentos próprios (criar, editar e apagar).
export function SegmentsManager({ rows, canManage }: { rows: SegmentRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<SegmentRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const days = String(data.get("days") ?? "").trim();
    const body = {
      name: String(data.get("name") ?? ""),
      description: String(data.get("description") ?? ""),
      rules: {
        stages: data.getAll("stages").map(String),
        optedOut: String(data.get("optedOut")),
        hasEmail: String(data.get("hasEmail")),
        createdWithinDays: days ? Number(days) : null,
      },
    };
    setBusy(true);
    setError(null);
    const result = editing === "new" ? await callApi("/api/segments", "POST", body) : editing?.id ? await callApi(`/api/segments/${editing.id}`, "PATCH", body) : { ok: false, error: "invalid_input" };
    setBusy(false);
    if (result.ok) {
      setEditing(null);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  async function remove(row: SegmentRow) {
    if (!row.id || !window.confirm(`Apagar o segmento «${row.name}»? Os contactos não são apagados.`)) return;
    setBusy(true);
    const result = await callApi(`/api/segments/${row.id}`, "DELETE");
    setBusy(false);
    if (result.ok) {
      setEditing(null);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  const current = editing && editing !== "new" ? editing.rules : null;

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={() => { setError(null); setEditing("new"); }} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Criar segmento
          </button>
        </div>
      )}

      <div className="glow-border overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Regras</th>
              <th className="px-5 py-3 text-right font-medium">Membros</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id ?? row.name} className="border-b border-border last:border-b-0 hover:bg-surface-2/40">
                <td className="px-5 py-4 font-medium text-foreground">{row.name}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">{row.type}</span>
                </td>
                <td className="px-5 py-4 text-muted">{row.description}</td>
                <td className="px-5 py-4 text-right font-medium text-foreground">{row.members.toLocaleString("pt-PT")}</td>
                <td className="px-5 py-4 text-right">
                  {row.id && canManage && (
                    <button type="button" aria-label={`Editar ${row.name}`} onClick={() => { setError(null); setEditing(row); }} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing === "new" ? "Criar segmento" : "Editar segmento"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <input name="name" required maxLength={80} defaultValue={editing === "new" ? "" : editing.name} placeholder="Nome do segmento" aria-label="Nome" className={`${INPUT} w-full`} />
            <input name="description" maxLength={200} defaultValue={editing === "new" ? "" : editing.note} placeholder="Nota (opcional)" aria-label="Nota" className={`${INPUT} w-full`} />

            <fieldset>
              <legend className="text-sm font-medium text-foreground">Fase do contacto</legend>
              <p className="mb-2 text-xs text-muted">Sem nenhuma marcada, entram contactos de qualquer fase.</p>
              <div className="flex flex-wrap gap-3">
                {LEAD_STAGES.map((stage: LeadStageValue) => (
                  <label key={stage} className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name="stages" value={stage} defaultChecked={current?.stages.includes(stage)} className="accent-emerald-500" />
                    {stageText(stage)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs text-muted">
                Tem e-mail
                <select name="hasEmail" defaultValue={current?.hasEmail ?? "any"} className={`${INPUT} w-full bg-[#111]`}>
                  {TRI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                Pediu para não receber
                <select name="optedOut" defaultValue={current?.optedOut ?? "any"} className={`${INPUT} w-full bg-[#111]`}>
                  {TRI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                Criado nos últimos (dias)
                <input name="days" type="number" min={1} max={3650} defaultValue={current?.createdWithinDays ?? ""} placeholder="Qualquer" className={`${INPUT} w-full`} />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={BTN_PRIMARY}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
                <button type="button" onClick={() => setEditing(null)} className={BTN_GHOST}>
                  Cancelar
                </button>
              </div>
              {editing !== "new" && (
                <button type="button" disabled={busy} onClick={() => void remove(editing)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                  Apagar
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
