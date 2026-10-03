"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { FIELD_LABEL, FIELD_MODES, POPUP_PRESETS, POSITIONS, POSITION_LABEL, type PopupConfig } from "@/lib/popups/schema";
import { percent } from "@/lib/campaigns/schema";

export interface PopupView {
  id: string;
  name: string;
  active: boolean;
  embedUrl: string;
  views: number;
  submissions: number;
  config: PopupConfig;
}

type Draft = { id: string | null; name: string; config: PopupConfig; domains: string };

const fromPopup = (popup: PopupView): Draft => ({ id: popup.id, name: popup.name, config: popup.config, domains: popup.config.allowedDomains.join("\n") });
const blank = (): Draft => fromPreset(POPUP_PRESETS[1].input);
const fromPreset = (input: { name: string; config: PopupConfig }): Draft => ({ id: null, name: input.name, config: input.config, domains: input.config.allowedDomains.join("\n") });

const snippet = (url: string) => `<script async src="${url}"></script>`;

const ERRORS: Record<string, string> = { invalid_input: "Verifique os campos: o título é obrigatório e os domínios têm de ser válidos (ex.: minhaloja.pt).", too_many: "Atingiu o limite de 10 popups." };

// Pré-visualização aproximada do popup, com o texto e a cor que está a editar.
function Preview({ config }: { config: PopupConfig }) {
  const align = config.position === "center" ? "items-center justify-center" : config.position === "bottom-right" ? "items-end justify-end" : "items-end justify-start";
  return (
    <div className={`flex min-h-[220px] rounded-xl bg-black/40 p-3 ${align}`} aria-label="Pré-visualização">
      <div className="w-full max-w-[260px] rounded-2xl bg-white p-4 text-[#111] shadow-xl">
        <p className="text-sm font-bold leading-tight">{config.title || "Título"}</p>
        {config.description && <p className="mt-1 text-xs text-[#444]">{config.description}</p>}
        <div className="mt-3 space-y-1.5">
          {config.askName !== "off" && <div className="rounded-lg border border-[#cfd4dc] px-2 py-1.5 text-xs text-[#888]">Nome</div>}
          <div className="rounded-lg border border-[#cfd4dc] px-2 py-1.5 text-xs text-[#888]">Telemóvel</div>
          {config.askEmail !== "off" && <div className="rounded-lg border border-[#cfd4dc] px-2 py-1.5 text-xs text-[#888]">E-mail</div>}
        </div>
        <p className="mt-2 text-[10px] text-[#555]">☐ {config.consentText}</p>
        <div className="mt-2 rounded-full py-2 text-center text-xs font-semibold text-white" style={{ background: config.color }}>
          {config.buttonText || "Enviar"}
        </div>
      </div>
    </div>
  );
}

export function PopupsManager({ popups, canManage }: { popups: PopupView[]; canManage: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const set = (patch: Partial<PopupConfig>) => setDraft((d) => (d ? { ...d, config: { ...d.config, ...patch } } : d));
  const fail = (code?: string) => setError(ERRORS[code ?? ""] ?? errorMessage(code));
  const open = (value: Draft) => { setError(null); setDraft(value); };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy("save");
    setError(null);
    const payload = { name: draft.name, config: { ...draft.config, allowedDomains: draft.domains.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean) } };
    const result = draft.id ? await callApi(`/api/popups/${draft.id}`, "PATCH", payload) : await callApi("/api/popups", "POST", payload);
    setBusy(null);
    if (result.ok) {
      setDraft(null);
      router.refresh();
    } else fail(result.error);
  }

  async function toggle(popup: PopupView) {
    setBusy(popup.id);
    setError(null);
    const result = await callApi(`/api/popups/${popup.id}`, "PATCH", { active: !popup.active });
    setBusy(null);
    if (result.ok) router.refresh();
    else fail(result.error);
  }

  async function remove(popup: PopupView) {
    if (!window.confirm(`Apagar o popup «${popup.name}»? O script deixa de mostrar o popup no seu site.`)) return;
    setBusy(popup.id);
    const result = await callApi(`/api/popups/${popup.id}`, "DELETE");
    setBusy(null);
    if (result.ok) router.refresh();
    else fail(result.error);
  }

  async function copy(popup: PopupView) {
    try {
      await navigator.clipboard.writeText(snippet(popup.embedUrl));
      setCopied(popup.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copie o código:", snippet(popup.embedUrl));
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Os seus popups</h2>
          {canManage && (
            <button type="button" onClick={() => open(blank())} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" />
              Criar popup
            </button>
          )}
        </div>
        {error && !draft && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}

        {popups.length === 0 ? (
          <div className="glow-border flex flex-col items-center rounded-2xl px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
              <Sparkles className="h-7 w-7 text-muted" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-foreground">Ainda não tem popups</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted">{canManage ? "Crie um, cole o código no seu site e comece a captar contactos." : "Quando o proprietário ou um gestor criar popups, aparecem aqui."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {popups.map((popup) => (
              <article key={popup.id} className="glow-border rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{popup.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {popup.config.trigger === "exit" ? "Ao sair da página" : `Após ${popup.config.delaySeconds} s`} · {POSITION_LABEL[popup.config.position]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {canManage && (
                      <>
                        <button type="button" aria-label={`Editar ${popup.name}`} onClick={() => open(fromPopup(popup))} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label={`Apagar ${popup.name}`} disabled={busy === popup.id} onClick={() => void remove(popup)} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button type="button" role="switch" aria-checked={popup.active} disabled={!canManage || busy === popup.id} onClick={() => void toggle(popup)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${popup.active ? "bg-neon-green/10 text-neon-green" : "bg-surface-2 text-muted"}`}>
                      <span className={`h-2 w-2 rounded-full ${popup.active ? "bg-neon-green" : "bg-muted"}`} />
                      {popup.active ? "Ativo" : "Desativado"}
                    </button>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-xs text-muted">Visualizações</dt>
                    <dd className="mt-0.5 text-lg font-semibold text-foreground">{popup.views.toLocaleString("pt-PT")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Registos</dt>
                    <dd className="mt-0.5 text-lg font-semibold text-foreground">{popup.submissions.toLocaleString("pt-PT")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Taxa de registo</dt>
                    <dd className="mt-0.5 text-lg font-semibold text-foreground">{popup.views > 0 ? `${percent(popup.submissions, popup.views)}%` : "—"}</dd>
                  </div>
                </dl>

                {canManage && (
                  <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3">
                    <p className="text-xs text-muted">Cole este código no seu site, uma só vez (antes de fechar o body). Ligue o popup para ele aparecer.</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-foreground/80">{snippet(popup.embedUrl)}</code>
                      <button type="button" onClick={() => void copy(popup)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary">
                        {copied === popup.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied === popup.id ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section>
          <h2 className="text-base font-semibold text-foreground">Comece por um modelo</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Escolha um, ajuste o texto e as cores no editor. Os popups novos nascem desligados.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {POPUP_PRESETS.map((preset) => (
              <article key={preset.id} className="glow-border flex flex-col rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground">{preset.title}</h3>
                <p className="mt-1 text-sm text-muted">{preset.description}</p>
                <button type="button" onClick={() => open(fromPreset(preset.input))} className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-foreground">
                  Usar este modelo
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {draft && (
        <Modal title={draft.id ? "Editar popup" : "Novo popup"} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="space-y-4">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={80} placeholder="Nome (só para si)" aria-label="Nome" className={`${INPUT} w-full`} />
            <input value={draft.config.title} onChange={(e) => set({ title: e.target.value })} required maxLength={80} placeholder="Título do popup" aria-label="Título" className={`${INPUT} w-full`} />
            <textarea value={draft.config.description} onChange={(e) => set({ description: e.target.value })} rows={2} maxLength={240} placeholder="Descrição (opcional)" aria-label="Descrição" className={`${INPUT} w-full`} />
            <div className="grid grid-cols-2 gap-3">
              <input value={draft.config.buttonText} onChange={(e) => set({ buttonText: e.target.value })} required maxLength={30} placeholder="Texto do botão" aria-label="Texto do botão" className={INPUT} />
              <label className="flex items-center gap-2 text-xs text-muted">
                Cor
                <input type="color" value={draft.config.color} onChange={(e) => set({ color: e.target.value })} aria-label="Cor" className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent" />
              </label>
            </div>
            <input value={draft.config.successMessage} onChange={(e) => set({ successMessage: e.target.value })} required maxLength={120} placeholder="Mensagem de sucesso" aria-label="Mensagem de sucesso" className={`${INPUT} w-full`} />
            <input value={draft.config.consentText} onChange={(e) => set({ consentText: e.target.value })} required maxLength={160} placeholder="Texto de consentimento" aria-label="Texto de consentimento" className={`${INPUT} w-full`} />

            <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-sm font-medium text-foreground">Campos do formulário (o telemóvel é sempre pedido)</legend>
              <label className="space-y-1 text-xs text-muted">
                Nome
                <select value={draft.config.askName} onChange={(e) => set({ askName: e.target.value as PopupConfig["askName"] })} className={`${INPUT} w-full bg-[#111]`}>
                  {FIELD_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {FIELD_LABEL[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                E-mail
                <select value={draft.config.askEmail} onChange={(e) => set({ askEmail: e.target.value as PopupConfig["askEmail"] })} className={`${INPUT} w-full bg-[#111]`}>
                  {FIELD_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {FIELD_LABEL[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                Indicativo por omissão
                <input value={draft.config.defaultDialCode} onChange={(e) => set({ defaultDialCode: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="351" inputMode="numeric" className={`${INPUT} w-full`} />
              </label>
            </fieldset>

            <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-sm font-medium text-foreground">Quando e onde aparece</legend>
              <label className="space-y-1 text-xs text-muted">
                Quando
                <select value={draft.config.trigger} onChange={(e) => set({ trigger: e.target.value as PopupConfig["trigger"] })} className={`${INPUT} w-full bg-[#111]`}>
                  <option value="delay">Após um tempo</option>
                  <option value="exit">Ao sair da página</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted">
                Espera (segundos)
                <input type="number" min={0} max={120} value={draft.config.delaySeconds} disabled={draft.config.trigger === "exit"} onChange={(e) => set({ delaySeconds: Math.max(0, Math.min(120, Math.round(Number(e.target.value) || 0))) })} className={`${INPUT} w-full`} />
              </label>
              <label className="space-y-1 text-xs text-muted">
                Posição
                <select value={draft.config.position} onChange={(e) => set({ position: e.target.value as PopupConfig["position"] })} className={`${INPUT} w-full bg-[#111]`}>
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {POSITION_LABEL[position]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-muted sm:col-span-3">
                Não voltar a mostrar a quem fechou ou se registou durante (dias; 0 = mostrar sempre)
                <input type="number" min={0} max={365} value={draft.config.frequencyDays} onChange={(e) => set({ frequencyDays: Math.max(0, Math.min(365, Math.round(Number(e.target.value) || 0))) })} className={`${INPUT} w-32`} />
              </label>
              <label className="space-y-1 text-xs text-muted sm:col-span-3">
                Sites autorizados (um por linha; vazio = qualquer site)
                <textarea value={draft.domains} onChange={(e) => setDraft({ ...draft, domains: e.target.value })} rows={2} placeholder="minhaloja.pt" className={`${INPUT} w-full`} />
              </label>
            </fieldset>

            <Preview config={draft.config} />

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={busy === "save"} className={BTN_PRIMARY}>
                {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
              <button type="button" onClick={() => setDraft(null)} className={BTN_GHOST}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
