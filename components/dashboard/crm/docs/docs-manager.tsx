"use client";

import { useState, type FormEvent } from "react";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";

export interface DocView {
  id: string;
  title: string;
  body: string;
  updatedLabel: string; // já formatado no servidor
  editor: string | null;
}

// Documentos partilhados com a equipa: criar, abrir, editar e apagar (apagar só para quem gere).
export function DocsManager({ docs, canDelete }: { docs: DocView[]; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DocView | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = { title: String(data.get("title") ?? ""), body: String(data.get("body") ?? "") };
    setBusy(true);
    setError(null);
    const result = editing === "new" ? await callApi("/api/crm/docs", "POST", body) : editing ? await callApi(`/api/crm/docs/${editing.id}`, "PATCH", body) : { ok: false, error: "invalid_input" };
    setBusy(false);
    if (result.ok) {
      setEditing(null);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  async function remove(doc: DocView) {
    if (!window.confirm(`Apagar o documento «${doc.title}»?`)) return;
    setBusy(true);
    const result = await callApi(`/api/crm/docs/${doc.id}`, "DELETE");
    setBusy(false);
    if (result.ok) {
      setEditing(null);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">Os seus documentos</h2>
        <button type="button" onClick={() => { setError(null); setEditing("new"); }} className={BTN_PRIMARY}>
          <Plus className="h-4 w-4" />
          Novo documento
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="glow-border flex flex-col items-center rounded-2xl px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
            <FileText className="h-7 w-7 text-muted" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">Ainda não tem documentos</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted">Crie o primeiro guião, política ou nota para partilhar com a equipa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <button key={doc.id} type="button" onClick={() => { setError(null); setEditing(doc); }} className="glow-border flex flex-col rounded-2xl p-5 text-left transition-colors hover:border-primary">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <FileText className="h-5 w-5 text-neon-green" />
              </span>
              <span className="mt-3 text-sm font-semibold text-foreground">{doc.title}</span>
              <span className="mt-1 line-clamp-2 text-xs text-muted">{doc.body || "Sem conteúdo"}</span>
              <span className="mt-4 border-t border-border pt-3 text-xs text-muted">
                Atualizado {doc.updatedLabel}
                {doc.editor ? ` · ${doc.editor}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "Novo documento" : "Editar documento"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <input name="title" required maxLength={120} defaultValue={editing === "new" ? "" : editing.title} placeholder="Título" aria-label="Título" className={`${INPUT} w-full`} />
            <textarea name="body" rows={12} maxLength={20000} defaultValue={editing === "new" ? "" : editing.body} placeholder="Escreva aqui o conteúdo..." aria-label="Conteúdo" className={`${INPUT} w-full`} />
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
              {editing !== "new" && canDelete && (
                <button type="button" disabled={busy} onClick={() => void remove(editing)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                  Apagar
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
