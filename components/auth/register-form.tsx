"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthField } from "@/components/auth/auth-field";

const ERROR_KEYS: Record<string, "exists" | "weak" | "invalidEmail" | "rateLimited" | "provisionFailed" | "generic"> = {
  email_exists: "exists",
  weak_password: "weak",
  invalid_email: "invalidEmail",
  rate_limited: "rateLimited",
  provision_failed: "provisionFailed",
};

export function RegisterForm() {
  const t = useTranslations("Auth.register");
  const router = useRouter();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [cooldown, setCooldown] = useState(60); // o Supabase/Resend limitam os reenvios: espera de 60 s
  const [resendMsg, setResendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!needsConfirmation || cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [needsConfirmation, cooldown]);

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, locale }),
      });
      if (res.ok) {
        setResendMsg({ ok: true, text: t("resendSent") });
        setCooldown(60);
      } else {
        setResendMsg({ ok: false, text: res.status === 429 ? t("rateLimited") : t("generic") });
        if (res.status === 429) setCooldown(60);
      }
    } catch {
      setResendMsg({ ok: false, text: t("generic") });
    } finally {
      setResending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const form = new FormData(event.currentTarget);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          workspaceName: form.get("workspace"),
          email: form.get("email"),
          password: form.get("password"),
          locale,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(t(ERROR_KEYS[data?.error] ?? "generic"));
        return;
      }

      if (data.needsConfirmation) {
        setPendingEmail(String(form.get("email") ?? "").trim());
        setNeedsConfirmation(true);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("generic"));
    } finally {
      setIsLoading(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-neon-green">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {t("confirmEmail")}
        </p>
        <p className="text-xs text-muted">{t("resendHint")}</p>
        <button
          type="button"
          onClick={resend}
          disabled={resending || cooldown > 0}
          className="text-sm font-medium text-neon-green hover:text-neon-green-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? t("resending") : cooldown > 0 ? t("resendWait", { seconds: cooldown }) : t("resend")}
        </button>
        {resendMsg && (
          <p role="status" className={`text-sm ${resendMsg.ok ? "text-neon-green" : "text-danger"}`}>
            {resendMsg.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField id="name" label={t("name")} autoComplete="name" />
      <AuthField id="workspace" label={t("workspace")} autoComplete="organization" />
      <AuthField id="email" type="email" label={t("email")} autoComplete="email" />
      <AuthField
        id="password"
        type="password"
        label={t("password")}
        autoComplete="new-password"
        minLength={8}
        hint={t("passwordHint")}
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <p className="text-xs text-muted">
        {t.rich("legalNotice", {
          terms: (chunks) => (
            <Link href="/terms" target="_blank" className="underline hover:text-foreground">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" target="_blank" className="underline hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <button
        type="submit"
        disabled={isLoading}
        className="neon-green-btn flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
