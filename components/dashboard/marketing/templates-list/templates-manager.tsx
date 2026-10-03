"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABEL, TEMPLATE_LANGUAGES, templateVariables } from "@/lib/templates/schema";
import type { TemplateStarter } from "@/lib/templates/starters";

export interface TemplateView {
  id: string;
  name: string;
  category: (typeof TEMPLATE_CATEGORIES)[number];
  language: string;
  body: string;
}

type Draft = { id: string | null; name: string; category: string; language: string; body: string };

const EMPTY: Draft = { id: null, name: "", category: "UTILITY", language: "pt_PT", body: "" };

// Biblioteca de modelos de mensagem: criar, editar e apagar, a partir do zero ou de um texto de partida.
export function TemplatesManager({ templates, starters, canManage }: { templates: TemplateView[]; starters: TemplateStarter[]; canManage: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (value: Draft) => { setError(null); setDraft(value); };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const data = new FormData(event.currentTarget);
    const body = { name: String(data.get("name") ?? ""), category: String(data.get("category")), language: String(data.get("language")), body: String(data.get("body") ?? "") };
    setBusy(true);
    setError(null);
    const result = draft.id ? await callApi(`/api/templates/${draft.id}`, "PATCH", body) : await callApi("/api/templates", "POST", body);
    setBusy(false);
    if (result.ok) {
      setDraft(null);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Apagar o modelo «${name}»?`)) return;
    setBusy(true);
    const result = await callApi(`/api/templates/${id}`, "DELETE");
    setBusy(false);
    if (result.ok) {
      setDraft(null);
      router.refresh();
    } else setError(errorMessage(result.error));
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Os seus modelos</h2>
          {canManage && (
            <button type="button" onClick={() => open(EMPTY)} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" />
              Novo template
            </button>
          )}
        </div>

        {templates.length === 0 ? (
          <div className="glow-border flex flex-col items-center rounded-2xl px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
              <MessageSquareText className="h-7 w-7 text-muted" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-foreground">Ainda não tem modelos</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted">Crie um do zero ou comece por um dos textos de partida abaixo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <article key={template.id} className="glow-border flex flex-col rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium text-foreground">{template.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {TEMPLATE_CATEGORY_LABEL[template.category]} · {TEMPLATE_LANGUAGES.find((l) => l.value === template.language)?.label ?? template.language}
                    </p>
                  </div>
                  {canManage && (
                    <button type="button" aria-label={`Editar ${template.name}`} onClick={() => open({ ...template })} className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3.5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{template.body}</p>
                </div>
                {templateVariables(template.body).length > 0 && <p className="mt-2 text-xs text-muted">Variáveis: {templateVariables(template.body).map((v) => `{{${v}}}`).join(", ")}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section>
          <h2 className="text-base font-semibold text-foreground">Textos de partida</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Escolha um, ajuste o texto e guarde.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starters.map((starter) => (
              <article key={starter.name} className="glow-border flex flex-col rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground">{starter.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  {TEMPLATE_CATEGORY_LABEL[starter.category]} · {starter.description}
                </p>
                <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3.5">
                  <p className="text-sm leading-relaxed text-foreground/80">{starter.body}</p>
                </div>
                <button type="button" onClick={() => open({ ...EMPTY, name: starter.name, category: starter.category, body: starter.body })} className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-foreground">
                  Usar este modelo
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {draft && (
        <Modal title={draft.id ? "Editar modelo" : "Novo modelo"} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="space-y-3">
            <input name="name" required maxLength={60} pattern="[a-z0-9_]+" defaultValue={draft.name} placeholder="nome_do_modelo" aria-label="Nome" title="Só minúsculas, números e sublinhado" className={`${INPUT} w-full font-mono`} />
            <div className="grid grid-cols-2 gap-3">
              <select name="category" defaultValue={draft.category} aria-label="Categoria" className={`${INPUT} bg-[#111]`}>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {TEMPLATE_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>
              <select name="language" defaultValue={draft.language} aria-label="Idioma" className={`${INPUT} bg-[#111]`}>
                {TEMPLATE_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea name="body" required rows={6} maxLength={1024} defaultValue={draft.body} placeholder="Texto da mensagem. Use {{1}}, {{2}}... para as variáveis." aria-label="Texto" className={`${INPUT} w-full`} />
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
                <button type="button" onClick={() => setDraft(null)} className={BTN_GHOST}>
                  Cancelar
                </button>
              </div>
              {draft.id && (
                <button type="button" disabled={busy} onClick={() => void remove(draft.id!, draft.name)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-red-300">
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
