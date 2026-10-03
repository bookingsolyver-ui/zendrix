"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";
import { NOTICE_AUDIENCES, NOTICE_AUDIENCE_LABEL } from "@/lib/email/notice-schema";

type Lang = "pt" | "en" | "es";
const LANGS: { value: Lang; label: string }[] = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];
const ERRORS: Record<string, string> = {
  start_required: "Uma manutenção precisa da data de início.",
  end_before_start: "O fim tem de ser depois do início.",
  invalid_input: "Verifique os campos (o português é obrigatório; assunto com 3+ e texto com 10+ caracteres).",
  email_not_configured: "O Resend não está configurado no servidor (RESEND_API_KEY e EMAIL_FROM).",
  send_failed: "O Resend recusou o envio de teste.",
  no_recipients: "Não há destinatários para este público.",
  too_many_recipients: "Demasiados destinatários para um só aviso.",
};

type Texts = Record<Lang, { subject: string; body: string }>;
const empty = (): Texts => ({ pt: { subject: "", body: "" }, en: { subject: "", body: "" }, es: { subject: "", body: "" } });

// O formulário de um aviso do sistema: tipo, público, janela e o texto em três línguas. Pode enviar um teste só
// ao próprio administrador antes de enviar a todos. Só recebe texto (nunca funções nem ícones do servidor).
export function NoticeComposer({ emailReady }: { emailReady: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"maintenance" | "notice">("maintenance");
  const [audience, setAudience] = useState<(typeof NOTICE_AUDIENCES)[number]>("all");
  const [texts, setTexts] = useState<Texts>(empty);
  const [tab, setTab] = useState<Lang>("pt");
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (lang: Lang, patch: Partial<{ subject: string; body: string }>) => setTexts((current) => ({ ...current, [lang]: { ...current[lang], ...patch } }));

  async function submit(event: FormEvent<HTMLFormElement>, mode: "test" | "send") {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const local = (name: string) => {
      const value = String(data.get(name) ?? "");
      return value ? new Date(value).toISOString() : null;
    };
    // Só vão as línguas preenchidas; o português é obrigatório (o servidor valida).
    const filled = (lang: Lang) => (texts[lang].subject.trim() && texts[lang].body.trim() ? texts[lang] : undefined);
    if (mode === "send" && !window.confirm(`Enviar este aviso a ${NOTICE_AUDIENCE_LABEL[audience].toLowerCase()}? Não se pode desfazer.`)) return;
    setBusy(mode);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, kind, audience, startsAt: local("startsAt"), endsAt: local("endsAt"), content: { pt: texts.pt, en: filled("en"), es: filled("es") }, testLang: tab }),
      });
      const body = (await res.json().catch(() => null)) as { success?: boolean; error?: string; recipients?: number; sentTo?: string; emailConfigured?: boolean } | null;
      if (res.ok && body?.success) {
        setMessage({ ok: true, text: mode === "test" ? `Teste enviado para ${body.sentTo}.` : `Aviso registado para ${body.recipients} destinatário(s). O envio já começou${body.emailConfigured ? "" : ", mas o Resend não está configurado: ficam pendentes"}.` });
        if (mode === "send") {
          setTexts(empty());
          router.refresh();
        }
      } else setMessage({ ok: false, text: ERRORS[body?.error ?? ""] ?? "Não foi possível concluir a ação." });
    } catch {
      setMessage({ ok: false, text: "Sem ligação ao servidor." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event, "send")} className={`${CARD} space-y-5`}>
      {!emailReady && <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-300">O Resend não está configurado neste servidor (RESEND_API_KEY e EMAIL_FROM): os avisos ficam registados e pendentes até estar.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-white/50">
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={`${INPUT} w-full bg-[#111]`}>
            <option value="maintenance">Manutenção programada</option>
            <option value="notice">Aviso importante</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-white/50">
          Enviar a
          <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} className={`${INPUT} w-full bg-[#111]`}>
            {NOTICE_AUDIENCES.map((value) => (
              <option key={value} value={value}>
                {NOTICE_AUDIENCE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        {kind === "maintenance" && (
          <>
            <label className="space-y-1 text-xs text-white/50">
              Início (a sua hora local)
              <input name="startsAt" type="datetime-local" required className={`${INPUT} w-full`} />
            </label>
            <label className="space-y-1 text-xs text-white/50">
              Fim (opcional)
              <input name="endsAt" type="datetime-local" className={`${INPUT} w-full`} />
            </label>
          </>
        )}
      </div>

      <div>
        <div className="mb-3 flex gap-2" role="tablist" aria-label="Língua do texto">
          {LANGS.map((lang) => (
            <button key={lang.value} type="button" role="tab" aria-selected={tab === lang.value} onClick={() => setTab(lang.value)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${tab === lang.value ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/50 hover:text-white"}`}>
              {lang.label}
              {lang.value === "pt" ? " *" : texts[lang.value].subject && texts[lang.value].body ? " ✓" : ""}
            </button>
          ))}
        </div>
        <input value={texts[tab].subject} onChange={(e) => set(tab, { subject: e.target.value })} required={tab === "pt"} maxLength={150} placeholder={`Assunto (${LANGS.find((l) => l.value === tab)!.label})`} aria-label="Assunto" className={`${INPUT} w-full`} />
        <textarea value={texts[tab].body} onChange={(e) => set(tab, { body: e.target.value })} required={tab === "pt"} rows={7} maxLength={5000} placeholder="Texto. Deixe uma linha em branco entre parágrafos." aria-label="Texto" className={`${INPUT} mt-3 w-full`} />
        <p className="mt-2 text-xs text-white/40">Cada pessoa recebe o aviso na sua língua. Se não escrever a versão em inglês ou espanhol, essas pessoas recebem o português.</p>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy !== null} className={BTN_PRIMARY}>
          {busy === "send" && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar a todos
        </button>
        <button type="button" disabled={busy !== null || !texts.pt.subject.trim() || !texts.pt.body.trim()} onClick={(event) => void submit({ preventDefault() {}, currentTarget: event.currentTarget.form! } as FormEvent<HTMLFormElement>, "test")} className={BTN_GHOST}>
          {busy === "test" && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
          Enviar teste só para mim ({tab.toUpperCase()})
        </button>
      </div>
    </form>
  );
}
