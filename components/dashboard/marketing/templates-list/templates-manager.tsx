"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MessageSquareText, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABEL, TEMPLATE_LANGUAGES, templateVariables } from "@/lib/templates/schema";
import type { TemplateStarter } from "@/lib/templates/starters";
import { META_STATUS_LABEL, asMetaStatus } from "@/lib/templates/meta-payload";

export interface TemplateView {
  id: string;
  name: string;
  category: (typeof TEMPLATE_CATEGORIES)[number];
  language: string;
  body: string;
  metaStatus?: string;
  rejectedReason?: string | null;
}

type Draft = { id: string | null; name: string; category: string; language: string; body: string };

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-white/10 text-white/70",
  PENDING: "bg-amber-400/15 text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-300",
  REJECTED: "bg-red-500/15 text-red-300",
  PAUSED: "bg-amber-400/15 text-amber-300",
  DISABLED: "bg-red-500/15 text-red-300",
};

const META_ERRORS: Record<string, string> = {
  no_waba: "Ligue primeiro o WhatsApp Business em Definições → WhatsApp.",
  token_expired: "O token da Meta expirou. Atualize-o em Definições → WhatsApp.",
  token_unreadable: "Não foi possível ler o token da Meta. Volte a ligar o WhatsApp.",
  already_submitted: "Este modelo já foi submetido à Meta.",
  rate_limited: "Demasiados pedidos seguidos. Aguarde um instante.",
  meta_transient: "A Meta está indisponível neste momento. Tente novamente daqui a pouco.",
  locked_by_meta: "Um modelo em análise ou aprovado não se edita. Crie um novo.",
};

// Chama as rotas da Meta e devolve a mensagem de erro pronta a mostrar (com o motivo da Meta, se houver).
async function metaCall(url: string, body?: unknown): Promise<{ ok: boolean; message?: string; data?: Record<string, number> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) return { ok: true, data };
    const base = META_ERRORS[data?.error] ?? "A Meta recusou o pedido.";
    return { ok: false, message: data?.detail && !META_ERRORS[data?.error] ? `${base} ${data.detail}` : base };
  } catch {
    return { ok: false, message: errorMessage("network") };
  }
}

const EMPTY: Draft = { id: null, name: "", category: "UTILITY", language: "pt_PT", body: "" };

// Biblioteca de modelos de mensagem: criar, editar e apagar, a partir do zero ou de um texto de partida.
export function TemplatesManager({ templates, starters, canManage }: { templates: TemplateView[]; starters: TemplateStarter[]; canManage: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bodyText, setBodyText] = useState("");
  const [examples, setExamples] = useState<string[]>([]);

  const open = (value: Draft) => { setError(null); setBodyText(value.body); setExamples([]); setDraft(value); };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const data = new FormData(event.currentTarget);
    const body = { name: String(data.get("name") ?? ""), category: String(data.get("category")), language: String(data.get("language")), body: String(data.get("body") ?? "") };
    setBusy(true);
    setError(null);
    const submit = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "submit";
    const result = draft.id ? await callApi(`/api/templates/${draft.id}`, "PATCH", body) : await callApi("/api/templates", "POST", body);
    if (!result.ok) {
      setBusy(false);
      setError(META_ERRORS[result.error ?? ""] ?? errorMessage(result.error));
      return;
    }
    // «Guardar e submeter»: o rascunho já ficou guardado; se a Meta recusar, o modelo continua aqui para corrigir.
    const templateId = draft.id ?? result.id;
    if (submit && templateId) {
      const sent = await metaCall(`/api/templates/${templateId}/submit`, { examples: templateVariables(body.body).map((_, i) => examples[i] ?? "") });
      if (!sent.ok) {
        setBusy(false);
        setError(`Guardado como rascunho, mas não foi submetido. ${sent.message}`);
        router.refresh();
        if (!draft.id) setDraft({ ...draft, id: templateId });
        return;
      }
      setNotice("Submetido à Meta. A aprovação demora normalmente alguns minutos: use «Sincronizar» para ver o resultado.");
    }
    setBusy(false);
    setDraft(null);
    router.refresh();
  }

  async function sync() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await metaCall("/api/templates/sync");
    setBusy(false);
    if (!result.ok) return setError(result.message ?? null);
    setNotice(`Sincronizado: ${result.data?.updated ?? 0} atualizado(s), ${result.data?.imported ?? 0} importado(s) da Meta.`);
    router.refresh();
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
            <div className="flex gap-2">
              <button type="button" onClick={() => void sync()} disabled={busy} className={BTN_GHOST}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sincronizar com a Meta
              </button>
              <button type="button" onClick={() => open(EMPTY)} className={BTN_PRIMARY}>
                <Plus className="h-4 w-4" />
                Novo template
              </button>
            </div>
          )}
        </div>
        {notice && <p role="status" className="mb-3 text-sm text-emerald-300">{notice}</p>}
        {!draft && error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}

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
                  {canManage && !["PENDING", "APPROVED"].includes(template.metaStatus ?? "DRAFT") && (
                    <button type="button" aria-label={`Editar ${template.name}`} onClick={() => open({ ...template })} className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-border bg-surface-2 p-3.5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{template.body}</p>
                </div>
                <p className="mt-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[asMetaStatus(template.metaStatus)]}`}>{META_STATUS_LABEL[asMetaStatus(template.metaStatus)]}</span>
                </p>
                {template.rejectedReason && <p className="mt-1 text-xs text-red-300">Motivo: {template.rejectedReason}</p>}
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
            <textarea name="body" required rows={6} maxLength={1024} defaultValue={draft.body} placeholder="Texto da mensagem. Use {{1}}, {{2}}... para as variáveis." aria-label="Texto" onChange={(event) => setBodyText(event.target.value)} className={`${INPUT} w-full`} />
            {templateVariables(bodyText).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted">A Meta pede um exemplo para cada variável (só para a análise; não é enviado aos clientes).</p>
                {templateVariables(bodyText).map((variable, index) => (
                  <input key={variable} value={examples[index] ?? ""} onChange={(event) => setExamples((prev) => { const next = [...prev]; next[index] = event.target.value; return next; })} maxLength={100} placeholder={`Exemplo para {{${variable}}}`} aria-label={`Exemplo para ${variable}`} className={`${INPUT} w-full`} />
                ))}
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button type="submit" value="save" disabled={busy} className={BTN_GHOST}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar rascunho
                </button>
                <button type="submit" value="submit" disabled={busy} className={BTN_PRIMARY}>
                  <Send className="h-4 w-4" />
                  Guardar e submeter à Meta
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
