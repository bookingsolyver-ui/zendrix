"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AuthField } from "@/components/auth/auth-field";

const COPY = {
  pt: {
    email: "E-mail do convite",
    name: "O seu nome",
    password: "Palavra-passe",
    hint: "Mínimo de 8 caracteres.",
    submit: "Aceitar convite e criar conta",
    submitting: "A criar…",
    confirm: "Conta criada. Confirme o seu e-mail para poder entrar.",
    errors: {
      weak_password: "A palavra-passe deve ter pelo menos 8 caracteres.",
      invite_invalid: "Este convite já não é válido. Peça um novo a quem o convidou.",
      email_exists: "Já existe uma conta com este e-mail. Inicie sessão: o convite é aplicado automaticamente.",
      rate_limited: "Demasiadas tentativas. Aguarde um pouco.",
      generic: "Não foi possível aceitar o convite. Tente novamente.",
    },
  },
  en: {
    email: "Invited email",
    name: "Your name",
    password: "Password",
    hint: "At least 8 characters.",
    submit: "Accept invite and create account",
    submitting: "Creating…",
    confirm: "Account created. Confirm your email to sign in.",
    errors: {
      weak_password: "Password must be at least 8 characters.",
      invite_invalid: "This invitation is no longer valid. Ask the person who invited you for a new one.",
      email_exists: "An account with this email already exists. Sign in: the invitation is applied automatically.",
      rate_limited: "Too many attempts. Please wait a moment.",
      generic: "We couldn't accept the invitation. Please try again.",
    },
  },
} as const;

export function AcceptInviteForm({ token, email, lang }: { token: string; email: string; lang: "pt" | "en" }) {
  const t = COPY[lang];
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: form.get("name"), password: form.get("password") }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(t.errors[data?.error as keyof typeof t.errors] ?? t.errors.generic);
        return;
      }
      if (data.needsConfirmation) {
        setNeedsConfirmation(true);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t.errors.generic);
    } finally {
      setPending(false);
    }
  }

  if (needsConfirmation) {
    return (
      <p className="flex items-start gap-2 text-sm text-neon-green">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {t.confirm}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="text-sm text-muted">{t.email}</p>
        <p className="mt-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground">{email}</p>
      </div>
      <AuthField id="name" label={t.name} autoComplete="name" />
      <AuthField id="password" type="password" label={t.password} autoComplete="new-password" minLength={8} hint={t.hint} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="neon-green-btn flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
