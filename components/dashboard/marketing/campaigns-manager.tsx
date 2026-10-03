"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Megaphone, Plus, Trash2, XCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { CAMPAIGN_STATUS_LABEL, MAX_MESSAGE_LENGTH, SKIP_REASON_LABEL, percent, type CampaignCounters, type CampaignStatusValue } from "@/lib/campaigns/schema";

export interface CampaignView {
  id: string;
  name: string;
  segmentName: string;
  message: string;
  status: CampaignStatusValue;
  scheduledLabel: string; // já formatado no servidor
  counters: CampaignCounters;
  skipped: Record<string, number>;
}

export interface SegmentOption {
  value: string; // "builtin:won" | "custom:<id>"
  label: string;
  members: number;
}

export interface TemplateOption {
  id: string;
  name: string;
  body: string;
}

const STATUS_STYLE: Record<CampaignStatusValue, string> = {
  SCHEDULED: "bg-blue-500/10 text-blue-400",
  SENDING: "bg-amber-400/15 text-amber-300",
  COMPLETED: "bg-emerald-500/10 text-emerald-400",
  FAILED: "bg-red-500/10 text-red-300",
  CANCELLED: "bg-white/10 text-white/50",
};

const ERRORS: Record<string, string> = {
  unknown_placeholder: "A única variável permitida é {{nome}}. Retire as outras.",
  invalid_schedule: "Escolha uma data futura (entre 1 minuto e 90 dias).",
  invalid_segment: "O segmento escolhido já não existe.",
  too_many_active: "Já tem 5 campanhas ativas. Espere que terminem ou cancele alguma.",
  still_active: "Cancele a campanha antes de a apagar.",
  not_active: "Esta campanha já terminou.",
};

// Um <input type="datetime-local"> dá a hora local do browser: converte-a para um instante absoluto (ISO).
const toIso = (local: string) => new Date(local).toISOString();

export function CampaignsManager({ campaigns, segments, templates, canManage }: { campaigns: CampaignView[]; segments: SegmentOption[]; templates: TemplateOption[]; canManage: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"now" | "later">("now");
  const [message, setMessage] = useState("");

  const active = campaigns.some((campaign) => campaign.status === "SENDING" || campaign.status === "SCHEDULED");
  // Enquanto há campanhas a enviar, os números atualizam-se sozinhos.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(timer);
  }, [active, router]);

  const fail = (code?: string) => setError(ERRORS[code ?? ""] ?? errorMessage(code));

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const when = String(data.get("when") ?? "");
    if (mode === "later" && !when) return setError("Escolha a data e a hora do envio.");
    if (!window.confirm(mode === "now" ? "Enviar esta campanha agora aos contactos do segmento?" : "Agendar esta campanha?")) return;
    setBusy("create");
    setError(null);
    const result = await callApi("/api/campaigns", "POST", {
      name: String(data.get("name") ?? ""),
      message,
      segment: String(data.get("segment")),
      schedule: mode === "now" ? { mode: "now" } : { mode: "later", at: toIso(when) },
    });
    setBusy(null);
    if (result.ok) {
      setCreating(false);
      setMessage("");
      setMode("now");
      router.refresh();
    } else fail(result.error);
  }

  async function cancel(campaign: CampaignView) {
    if (!window.confirm(`Cancelar a campanha «${campaign.name}»? O que ainda não saiu não será enviado.`)) return;
    setBusy(campaign.id);
    const result = await callApi(`/api/campaigns/${campaign.id}`, "PATCH", { action: "cancel" });
    setBusy(null);
    if (result.ok) router.refresh();
    else fail(result.error);
  }

  async function remove(campaign: CampaignView) {
    if (!window.confirm(`Apagar a campanha «${campaign.name}» e o seu histórico?`)) return;
    setBusy(campaign.id);
    const result = await callApi(`/api/campaigns/${campaign.id}`, "DELETE");
    setBusy(null);
    if (result.ok) router.refresh();
    else fail(result.error);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">As suas campanhas</h2>
        {canManage && (
          <button type="button" onClick={() => { setError(null); setCreating(true); }} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" />
            Nova campanha
          </button>
        )}
      </div>
      {error && !creating && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      {campaigns.length === 0 ? (
        <div className="glow-border flex flex-col items-center rounded-2xl px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2">
            <Megaphone className="h-7 w-7 text-muted" />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">Ainda não tem campanhas</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted">{canManage ? "Crie a primeira: escolha um segmento, escreva a mensagem e envie agora ou agende." : "Quando o proprietário ou um gestor criar campanhas, aparecem aqui."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const c = campaign.counters;
            const stats = [
              { label: "Destinatários", value: c.total },
              { label: "Enviadas", value: c.sent, hint: c.total ? `${percent(c.sent, c.total)}%` : undefined },
              { label: "Entregues", value: c.delivered, hint: c.sent ? `${percent(c.delivered, c.sent)}%` : undefined },
              { label: "Lidas", value: c.read, hint: c.delivered ? `${percent(c.read, c.delivered)}%` : undefined },
              { label: "Na fila", value: c.queued + c.pending },
              { label: "Falhadas", value: c.failed },
              { label: "Ignoradas", value: c.skipped },
            ];
            const skippedDetail = Object.entries(campaign.skipped).filter(([reason]) => reason !== "internal").map(([reason, n]) => `${SKIP_REASON_LABEL[reason] ?? reason}: ${n}`);
            return (
              <article key={campaign.id} className="glow-border rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{campaign.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {campaign.segmentName} · {campaign.status === "SCHEDULED" ? `para ${campaign.scheduledLabel}` : campaign.scheduledLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[campaign.status]}`}>{CAMPAIGN_STATUS_LABEL[campaign.status]}</span>
                    {canManage && (campaign.status === "SCHEDULED" || campaign.status === "SENDING") && (
                      <button type="button" disabled={busy === campaign.id} onClick={() => void cancel(campaign)} className="flex items-center gap-1 text-xs text-white/50 hover:text-red-300">
                        <XCircle className="h-4 w-4" />
                        Cancelar
                      </button>
                    )}
                    {canManage && (campaign.status === "COMPLETED" || campaign.status === "FAILED" || campaign.status === "CANCELLED") && (
                      <button type="button" disabled={busy === campaign.id} onClick={() => void remove(campaign)} aria-label={`Apagar ${campaign.name}`} className="text-white/40 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 rounded-xl border border-border bg-surface-2 p-3 text-sm text-foreground/80">{campaign.message}</p>
                <dl className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {stats.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-xs text-muted">{stat.label}</dt>
                      <dd className="mt-0.5 text-lg font-semibold text-foreground">
                        {stat.value.toLocaleString("pt-PT")}
                        {stat.hint && <span className="ml-1 text-xs font-normal text-muted">{stat.hint}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                {skippedDetail.length > 0 && <p className="mt-3 text-xs text-muted">Ignoradas — {skippedDetail.join(" · ")}</p>}
              </article>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal title="Nova campanha" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="space-y-4">
            <input name="name" required maxLength={80} placeholder="Nome da campanha (só para si)" aria-label="Nome" className={`${INPUT} w-full`} />

            <label className="block space-y-1 text-xs text-muted">
              Enviar a
              <select name="segment" required defaultValue="" className={`${INPUT} w-full bg-[#111]`}>
                <option value="" disabled>
                  Escolha um segmento
                </option>
                {segments.map((segment) => (
                  <option key={segment.value} value={segment.value}>
                    {segment.label} ({segment.members})
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              {templates.length > 0 && (
                <select aria-label="Usar um modelo guardado" defaultValue="" onChange={(event) => { const t = templates.find((x) => x.id === event.target.value); if (t) setMessage(t.body.replace(/\{\{1\}\}/g, "{{nome}}")); }} className={`${INPUT} w-full bg-[#111]`}>
                  <option value="">Começar de um modelo guardado (opcional)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              )}
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={5} maxLength={MAX_MESSAGE_LENGTH} placeholder="Escreva a mensagem. Use {{nome}} para o primeiro nome da pessoa." aria-label="Mensagem" className={`${INPUT} w-full`} />
              <p className="text-right text-xs text-muted">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Quando enviar</legend>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="radio" name="mode" checked={mode === "now"} onChange={() => setMode("now")} className="accent-emerald-500" />
                Agora
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="radio" name="mode" checked={mode === "later"} onChange={() => setMode("later")} className="accent-emerald-500" />
                Agendar
              </label>
              {mode === "later" && <input name="when" type="datetime-local" required className={INPUT} aria-label="Data e hora" />}
            </fieldset>

            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-muted">
              O WhatsApp só permite mensagens livres a quem escreveu nas últimas 24 horas. Os restantes contactos do segmento são ignorados (e contados). Quem pediu para não receber mensagens automáticas nunca recebe.
            </p>

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={busy === "create"} className={BTN_PRIMARY}>
                {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "now" ? "Enviar agora" : "Agendar"}
              </button>
              <button type="button" onClick={() => setCreating(false)} className={BTN_GHOST}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
