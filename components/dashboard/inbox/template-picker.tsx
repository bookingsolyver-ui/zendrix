"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { renderTemplate } from "@/lib/templates/meta-payload";
import type { ChatMessage } from "@/lib/inbox/types";

interface ApprovedTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  body: string;
  variables: string[];
}

const ERRORS: Record<string, string> = {
  template_not_approved: "A Meta já não tem este modelo aprovado. Sincronize em Marketing → Templates.",
  template_unsupported: "Este modelo tem cabeçalho ou botões dinâmicos que ainda não são suportados.",
  invalid_params: "Preencha todas as variáveis (sem texto vazio).",
  unsupported_platform: "Os modelos só funcionam em conversas de WhatsApp.",
  no_integration: "Não há nenhum canal de WhatsApp ligado.",
  subscription_required: "O seu plano não está ativo. Ative-o em Configurações → Faturação para voltar a enviar.",
  rate_limited: "Está a enviar depressa demais. Aguarde um instante.",
};

// Escolher um modelo aprovado, preencher as variáveis e enviar. Funciona fora da janela de 24 h.
export function TemplatePicker({ conversationId, onClose, onSent }: { conversationId: string; onClose: () => void; onSent: (message: ChatMessage) => void }) {
  const [templates, setTemplates] = useState<ApprovedTemplate[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/templates/approved", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load"))))
      .then((data) => alive && setTemplates(data.templates))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const selected = templates?.find((t) => t.id === selectedId) ?? null;
  const ready = selected !== null && selected.variables.every((_, i) => (values[i] ?? "").trim().length > 0);

  async function send() {
    if (!selected || !ready || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, templateId: selected.id, params: selected.variables.map((_, i) => (values[i] ?? "").trim()) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível enviar o modelo. Tente novamente.");
        return;
      }
      onSent(data.message);
      onClose();
    } catch {
      setError("Não foi possível enviar o modelo. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Enviar template" onClose={onClose}>
      {!templates && !loadFailed && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted" />}
      {loadFailed && <p className="text-sm text-danger">Não foi possível carregar os modelos.</p>}
      {templates?.length === 0 && (
        <p className="text-sm text-muted">Ainda não há modelos aprovados pela Meta. Submeta um em Marketing → Templates e use «Sincronizar com a Meta» quando for aprovado.</p>
      )}

      {templates && templates.length > 0 && !selected && (
        <ul className="space-y-2">
          {templates.map((template) => (
            <li key={template.id}>
              <button type="button" onClick={() => { setSelectedId(template.id); setValues([]); setError(null); }} className="w-full rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors hover:border-primary">
                <p className="font-mono text-sm font-medium text-foreground">{template.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{template.body}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-3">
          <button type="button" onClick={() => setSelectedId(null)} className="text-xs text-muted hover:text-foreground">← Escolher outro modelo</button>
          {selected.variables.map((variable, index) => (
            <input key={variable} value={values[index] ?? ""} onChange={(event) => setValues((prev) => { const next = [...prev]; next[index] = event.target.value; return next; })} maxLength={200} placeholder={`Valor para {{${variable}}}`} aria-label={`Variável ${variable}`} className={`${INPUT} w-full`} />
          ))}
          <div className="rounded-xl border border-border bg-surface-2 p-3.5">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">Pré-visualização</p>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{renderTemplate(selected.body, values.map((v) => v.trim())).replace(/\{\{\d+\}\}/g, "…") || selected.body}</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="button" onClick={() => void send()} disabled={!ready || sending} className={BTN_PRIMARY}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar template
          </button>
        </div>
      )}
    </Modal>
  );
}
