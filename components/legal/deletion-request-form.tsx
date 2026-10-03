"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

const COPY = {
  pt: {
    label: "O seu e-mail",
    submit: "Pedir eliminação",
    sending: "A enviar…",
    doneTitle: "Pedido registado.",
    doneBody: "Guarde este código para acompanhar o pedido:",
    doneNext: "Vamos confirmar que o e-mail é seu antes de apagar e respondemos em 30 dias.",
    track: "Ver estado do pedido",
    errors: {
      invalid_email: "Introduza um e-mail válido.",
      rate_limited: "Demasiados pedidos. Tente mais tarde.",
      generic: "Não foi possível registar o pedido. Tente novamente.",
    },
  },
  en: {
    label: "Your email",
    submit: "Request deletion",
    sending: "Sending…",
    doneTitle: "Request recorded.",
    doneBody: "Keep this code to track the request:",
    doneNext: "We will confirm the email is yours before deleting and reply within 30 days.",
    track: "View request status",
    errors: {
      invalid_email: "Enter a valid email.",
      rate_limited: "Too many requests. Try again later.",
      generic: "We couldn't record the request. Please try again.",
    },
  },
} as const;

export function DeletionRequestForm({ lang }: { lang: "pt" | "en" }) {
  const t = COPY[lang];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = new FormData(event.currentTarget).get("email");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(t.errors[data?.error as keyof typeof t.errors] ?? t.errors.generic);
        return;
      }
      setCode(data.code);
    } catch {
      setError(t.errors.generic);
    } finally {
      setPending(false);
    }
  }

  if (code) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          {t.doneTitle}
        </p>
        <p className="mt-2">{t.doneBody}</p>
        <p className="mt-1 select-all font-mono text-lg tracking-wider">{code}</p>
        <p className="mt-3 text-emerald-100/80">{t.doneNext}</p>
        <Link href={`/data-deletion/status?code=${code}`} className="mt-3 inline-block underline">
          {t.track}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm text-white/70" htmlFor="deletion-email">
        {t.label}
      </label>
      <input
        id="deletion-email"
        name="email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50"
      />
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="neon-btn flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t.sending : t.submit}
      </button>
    </form>
  );
}
