"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT, TIMEZONES } from "@/components/dashboard/settings/ui";
import type { FollowUpConfig } from "@/lib/followups/config";

const MAX_TOTAL = 23 * 60;

const human = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};

const ISSUE_TEXT: Record<string, string> = {
  total_exceeds_window: "A soma dos intervalos não pode passar de 23 horas: a Meta só permite mensagens livres até 24 horas depois da última mensagem do cliente.",
  invalid_timezone: "Fuso horário inválido.",
};

export function FollowUpsForm({ initial, agentOn }: { initial: FollowUpConfig; agentOn: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [steps, setSteps] = useState(initial.steps.map((s) => s.afterMinutes));
  const [quietStart, setQuietStart] = useState(initial.quietHours.start);
  const [quietEnd, setQuietEnd] = useState(initial.quietHours.end);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const total = steps.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const tooLong = total > MAX_TOTAL;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/followups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, steps: steps.map((afterMinutes) => ({ afterMinutes })), quietHours: { start: quietStart, end: quietEnd }, timezone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const message = data?.issues?.map((i: { message: string }) => ISSUE_TEXT[i.message]).find(Boolean);
        setError(message ?? "Configuração inválida. Verifique os valores (cada passo entre 30 min e 23 h).");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className={CARD}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500" />
          <span>
            <span className="block text-sm font-semibold text-white">Seguimentos automáticos</span>
            <span className="mt-1 block text-sm text-white/50">
              Se um cliente deixar de responder, a IA envia uma mensagem de seguimento a retomar a conversa. Cada mensagem é escrita a partir do que foi dito.
            </span>
          </span>
        </label>
        {enabled && !agentOn && (
          <p role="alert" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
            Os seguimentos só funcionam com a IA ligada. Ligue-a em Primeiros passos.
          </p>
        )}
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-white">Quando enviar</h2>
        <p className="mt-1 text-sm text-white/50">Cada intervalo conta desde a última mensagem nossa sem resposta.</p>
        <ol className="mt-4 space-y-3">
          {steps.map((value, index) => (
            <li key={index} className="flex flex-wrap items-center gap-3">
              <span className="w-24 text-sm text-white/60">Seguimento {index + 1}</span>
              <input
                type="number"
                min={30}
                max={1380}
                step={15}
                value={value}
                onChange={(e) => setSteps(steps.map((s, i) => (i === index ? Number(e.target.value) : s)))}
                aria-label={`Minutos até ao seguimento ${index + 1}`}
                className={`${INPUT} w-28`}
              />
              <span className="text-sm text-white/50">minutos ({human(value)}) depois</span>
              {steps.length > 1 && (
                <button type="button" onClick={() => setSteps(steps.filter((_, i) => i !== index))} aria-label="Remover seguimento" className="text-white/40 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ol>
        {steps.length < 3 && (
          <button type="button" onClick={() => setSteps([...steps, 60])} className={`${BTN_GHOST} mt-4 inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            Adicionar seguimento
          </button>
        )}
        <p className={`mt-4 text-sm ${tooLong ? "text-red-300" : "text-white/40"}`}>
          Total: {human(total)} (máximo 23 h). A Meta só permite mensagens livres até 24 horas depois da última mensagem do cliente: depois disso seria preciso um template aprovado.
        </p>
      </div>

      <div className={CARD}>
        <h2 className="text-sm font-semibold text-white">Horas de silêncio</h2>
        <p className="mt-1 text-sm text-white/50">Não se envia nada durante este período (hora local).</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/60">
          <span>Das</span>
          <input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} className={INPUT} aria-label="Início do silêncio" />
          <span>às</span>
          <input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} className={INPUT} aria-label="Fim do silêncio" />
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={`${INPUT} bg-[#111]`} aria-label="Fuso horário">
            {[...new Set([timezone, ...TIMEZONES])].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${CARD} text-sm text-white/50`}>
        <h2 className="text-sm font-semibold text-white">O que nunca acontece</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Não se envia a quem pediu para não receber mensagens (&quot;parar&quot;, &quot;stop&quot;...).</li>
          <li>Não se envia se uma pessoa da equipa assumiu a conversa (IA pausada).</li>
          <li>Não se envia a clientes já fechados (pagaram ou recusaram).</li>
          <li>Não se envia se o cliente respondeu: nesse caso é a IA que lhe responde.</li>
          <li>Todas as mensagens saem pela fila com ritmo controlado, para proteger o seu número.</li>
        </ul>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || tooLong} className={BTN_PRIMARY}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
        {saved && <span role="status" className="text-sm text-emerald-300">Guardado.</span>}
      </div>
    </form>
  );
}
