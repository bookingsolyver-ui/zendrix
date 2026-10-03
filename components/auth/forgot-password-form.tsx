"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AuthField } from "@/components/auth/auth-field";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgot");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = new FormData(event.currentTarget).get("email");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(t(data?.error === "invalid_email" ? "invalidEmail" : data?.error === "rate_limited" ? "rateLimited" : "generic"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("generic"));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-neon-green">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {t("sent")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <AuthField id="email" type="email" label={t("email")} autoComplete="email" />
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
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
