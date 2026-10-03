"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import {
  ACTION_LABEL,
  ACTION_TYPES,
  AUTOMATION_PRESETS,
  MAX_ACTIONS,
  MAX_DELAY_MINUTES,
  SETTABLE_STAGES,
  STAGE_LABEL,
  TRIGGERS,
  TRIGGER_HINT,
  TRIGGER_LABEL,
  describeActions,
  type ActionConfig,
  type ActionType,
  type AutomationInput,
  type TriggerValue,
} from "@/lib/automations/schema";

export interface AutomationView {
  id: string;
  name: string;
  trigger: TriggerValue;
  keyword: string;
  actions: ActionConfig[];
  active: boolean;
  runs: number;
  messages: number;
  failed: number;
}

export interface RunView {
  id: string;
  automationName: string;
  contact: string;
  whenLabel: string;
  status: "Em curso" | "Concluída" | "Ignorada" | "Falhou";
  steps: { type: ActionType; status: string; reason: string | null }[];
}

type DraftAction = { type: ActionType; text: string; stage: (typeof SETTABLE_STAGES)[number]; title: string; delayMinutes: number };
type Draft = { id: string | null; name: string; trigger: TriggerValue; keyword: string; actions: DraftAction[] };

const blankAction = (): DraftAction => ({ type: "SEND_MESSAGE", text: "", stage: "QUALIFIED", title: "", delayMinutes: 0 });
const blankDraft = (): Draft => ({ id: null, name: "", trigger: "NEW_CONTACT", keyword: "", actions: [blankAction()] });

const toDraftAction = (action: ActionConfig): DraftAction => ({ ...blankAction(), type: action.type, delayMinutes: action.delayMinutes, ...(action.type === "SEND_MESSAGE" ? { text: action.text } : action.type === "SET_STAGE" ? { stage: action.stage } : { title: action.title }) });
const fromPreset = (input: AutomationInput): Draft => ({ id: null, name: input.name, trigger: input.trigger, keyword: input.config.keyword, actions: input.actions.map(toDraftAction) });

const toPayload = (draft: Draft) => ({
  name: draft.name,
  trigger: draft.trigger,
  config: { keyword: draft.trigger === "MESSAGE_RECEIVED" ? draft.keyword : "" },
  actions: draft.actions.map((a) => {
    const delayMinutes = Math.max(0, Math.min(MAX_DELAY_MINUTES, Math.round(Number(a.delayMinutes) || 0)));
    return a.type === "SEND_MESSAGE" ? { type: a.type, text: a.text, delayMinutes } : a.type === "SET_STAGE" ? { type: a.type, stage: a.stage, delayMinutes } : { type: a.type, title: a.title, delayMinutes };
  }),
});

const STEP_STATUS: Record<string, string> = { PENDING: "à espera", PROCESSING: "a executar", DONE: "feita", SKIPPED: "ignorada", FAILED: "falhou" };
const REASONS: Record<string, string> = {
  opted_out: "pediu para não receber",
  no_conversation: "sem conversa",
  window_closed: "fora da janela de 24 h",
  no_integration: "canal desligado",
  human_took_over: "um humano assumiu",
  daily_cap: "limite diário",
  no_change: "sem alteração",
  previous_failed: "ação anterior falhou",
  automation_inactive: "automação desligada",
  subscription_required: "plano inativo",
  worker_interrupted: "interrompida",
  too_many_tasks: "quadro cheio",
  internal: "erro interno",
};
const RUN_STYLE: Record<RunView["status"], string> = { "Em curso": "bg-amber-400/15 text-amber-300", Concluída: "bg-emerald-500/10 text-emerald-400", Ignorada: "bg-white/10 text-white/50", Falhou: "bg-red-500/10 text-red-300" };

const ERRORS: Record<string, string> = {
  unknown_placeholder: "A única variável permitida é {{nome}}.",
  keyword_not_allowed: "A palavra-chave só se usa no gatilho «Mensagem recebida».",
  too_many: "Atingiu o limite de 20 automações.",
};

export function AutomationsManager({ automations, runs, canManage }: { automations: AutomationView[]; runs: RunView[]; canManage: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fail = (code?: string) => setError(ERRORS[code ?? ""] ?? errorMessage(code));
  const setAction = (index: number, patch: Partial<DraftAction>) => setDraft((d) => (d ? { ...d, actions: d.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)) } : d));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy("save");
    setError(null);
    const payload = toPayload(draft);
    const result = draft.id ? await callApi(`/api/automations/${draft.id}`, "PATCH", payload) : await callApi("/api/automations", "POST", payload);
    setBusy(null);
    if (result.ok) {
      setDraft(null);
      router.refresh();
    } else fail(result.error);
  }

  async function toggle(automation: AutomationView) {
    setBusy(automation.id);
    setError(null);
    const result = await callApi(`/api/automations/${automation.id}`, "PATCH", { active: !automation.active });
    setBusy(null);
    if (result.ok) router.refresh();
    else fail(result.error);
  }

  async function remove(automation: AutomationView) {
    if (!window.confirm(`Apagar a automação «${automation.name}» e o seu histórico?`)) return;
    setBusy(automation.id);
    const result = await callApi(`/api/automations/${automation.id}`, "DELETE");
    setBusy(null);
    if (result.ok) router.refresh();
    else fail(result.error);
  }

  const open = (value: Draft) => { setError(null); setDraft(value); };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">As suas automações</h2>
          {canManage && (
            <button type="button" onClick={() => open(blankDraft())} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" />
              Nova automação
            </button>
          )}
        </div>
        {error && !draft && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}

        {automations.length === 0 ? (
          <div className="glow-border flex flex-col items-center rounded-2xl px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
              <Workflow className="h-7 w-7 text-muted" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-foreground">Ainda não tem automações</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted">{canManage ? "Crie uma do zero ou comece por um dos modelos abaixo." : "Quando o proprietário ou um gestor criar automações, aparecem aqui."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((automation) => (
              <article key={automation.id} className="glow-border rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{automation.name}</h3>
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-medium text-foreground/80">Quando:</span> {TRIGGER_LABEL[automation.trigger]}
                      {automation.keyword ? ` («${automation.keyword}»)` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      <span className="font-medium text-foreground/80">Então:</span> {describeActions(automation.actions)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {canManage && (
                      <>
                        <button type="button" aria-label={`Editar ${automation.name}`} onClick={() => open({ id: automation.id, name: automation.name, trigger: automation.trigger, keyword: automation.keyword, actions: automation.actions.map(toDraftAction) })} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label={`Apagar ${automation.name}`} disabled={busy === automation.id} onClick={() => void remove(automation)} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={automation.active}
                      disabled={!canManage || busy === automation.id}
                      onClick={() => void toggle(automation)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${automation.active ? "bg-neon-green/10 text-neon-green" : "bg-surface-2 text-muted"}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${automation.active ? "bg-neon-green" : "bg-muted"}`} />
                      {automation.active ? "Ativada" : "Desativada"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Últimos 7 dias: {automation.runs} execuç{automation.runs === 1 ? "ão" : "ões"} · {automation.messages} mensage{automation.messages === 1 ? "m enviada" : "ns enviadas"} · {automation.failed} falha{automation.failed === 1 ? "" : "s"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section>
          <h2 className="text-base font-semibold text-foreground">Modelos prontos</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Reveja o texto antes de guardar. As automações novas nascem desligadas.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {AUTOMATION_PRESETS.map((preset) => (
              <article key={preset.id} className="glow-border flex flex-col rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground">{preset.title}</h3>
                <p className="mt-1 text-sm text-muted">{preset.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {TRIGGER_LABEL[preset.input.trigger]} → {describeActions(preset.input.actions)}
                </p>
                <button type="button" onClick={() => open(fromPreset(preset.input))} className="mt-4 w-full rounded-full border border-border py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-foreground">
                  Usar este modelo
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-foreground">Histórico de execuções</h2>
        <p className="mb-4 mt-1 text-sm text-muted">As últimas execuções, com o resultado de cada ação.</p>
        {runs.length === 0 ? (
          <p className="glow-border rounded-2xl p-6 text-sm text-muted">Ainda não houve execuções. Ative uma automação: só reage ao que acontecer depois disso.</p>
        ) : (
          <div className="glow-border divide-y divide-border rounded-2xl">
            {runs.map((run) => (
              <div key={run.id} className="flex flex-wrap items-start justify-between gap-2 p-4 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {run.automationName} <span className="font-normal text-muted">· {run.contact}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{run.steps.map((step) => `${ACTION_LABEL[step.type]}: ${STEP_STATUS[step.status] ?? step.status}${step.reason ? ` (${REASONS[step.reason] ?? step.reason})` : ""}`).join(" → ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{run.whenLabel}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${RUN_STYLE[run.status]}`}>{run.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {draft && (
        <Modal title={draft.id ? "Editar automação" : "Nova automação"} onClose={() => setDraft(null)}>
          <form onSubmit={save} className="space-y-4">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={80} placeholder="Nome da automação" aria-label="Nome" className={`${INPUT} w-full`} />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Quando</p>
              <select value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value as TriggerValue })} aria-label="Gatilho" className={`${INPUT} w-full bg-[#111]`}>
                {TRIGGERS.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {TRIGGER_LABEL[trigger]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">{TRIGGER_HINT[draft.trigger]}</p>
              {draft.trigger === "MESSAGE_RECEIVED" && <input value={draft.keyword} onChange={(e) => setDraft({ ...draft, keyword: e.target.value })} maxLength={60} placeholder="Palavra-chave (opcional, ex.: preço)" aria-label="Palavra-chave" className={`${INPUT} w-full`} />}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Então (por ordem)</p>
              {draft.actions.map((action, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
                  <div className="flex items-center gap-2">
                    <select value={action.type} onChange={(e) => setAction(index, { type: e.target.value as ActionType })} aria-label={`Ação ${index + 1}`} className={`${INPUT} flex-1 bg-[#111]`}>
                      {ACTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {ACTION_LABEL[type]}
                        </option>
                      ))}
                    </select>
                    {draft.actions.length > 1 && (
                      <button type="button" aria-label={`Remover ação ${index + 1}`} onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, i) => i !== index) })} className="text-muted hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {action.type === "SEND_MESSAGE" && <textarea value={action.text} onChange={(e) => setAction(index, { text: e.target.value })} required rows={3} maxLength={1000} placeholder="Mensagem. Use {{nome}} para o primeiro nome." aria-label="Mensagem" className={`${INPUT} w-full`} />}
                  {action.type === "SET_STAGE" && (
                    <select value={action.stage} onChange={(e) => setAction(index, { stage: e.target.value as DraftAction["stage"] })} aria-label="Fase" className={`${INPUT} w-full bg-[#111]`}>
                      {SETTABLE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {STAGE_LABEL[stage]}
                        </option>
                      ))}
                    </select>
                  )}
                  {action.type === "CREATE_TASK" && <input value={action.title} onChange={(e) => setAction(index, { title: e.target.value })} required maxLength={140} placeholder="Título da tarefa. Use {{nome}} se quiser." aria-label="Título da tarefa" className={`${INPUT} w-full`} />}
                  <label className="flex items-center gap-2 text-xs text-muted">
                    Esperar
                    <input type="number" min={0} max={MAX_DELAY_MINUTES} value={action.delayMinutes} onChange={(e) => setAction(index, { delayMinutes: Number(e.target.value) })} aria-label="Minutos de espera" className={`${INPUT} w-24`} />
                    minutos antes desta ação (máx. {MAX_DELAY_MINUTES})
                  </label>
                </div>
              ))}
              {draft.actions.length < MAX_ACTIONS && (
                <button type="button" onClick={() => setDraft({ ...draft, actions: [...draft.actions, blankAction()] })} className="text-sm text-muted hover:text-foreground">
                  + Adicionar ação
                </button>
              )}
            </div>

            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-muted">
              As mensagens seguem as regras do WhatsApp: só dentro das 24 horas depois da última mensagem do cliente. Nunca são enviadas a quem pediu para parar nem quando um humano assumiu a conversa.
            </p>
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
