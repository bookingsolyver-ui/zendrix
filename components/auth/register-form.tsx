"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

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
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setError(t(ERROR_KEYS[data?.error] ?? "generic"));
        return;
      }

      if (data.needsConfirmation) {
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
      <p className="flex items-start gap-2 text-sm text-neon-green">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {t("confirmEmail")}
      </p>
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
