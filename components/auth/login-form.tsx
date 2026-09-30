"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthField } from "@/components/auth/auth-field";

// Only same-site relative paths, so `?next=` cannot redirect to another origin.
function safeNext(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}

export function LoginForm({ next, callbackError }: { next?: string; callbackError?: boolean }) {
  const t = useTranslations("Auth.login");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ? t("callbackError") : null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const form = new FormData(event.currentTarget);
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (signInError) {
        setError(t("invalid"));
        return;
      }

      // Safety net: creates the User + Workspace rows if registration only got halfway.
      const res = await fetch("/api/auth/provision", { method: "POST" });
      if (!res.ok) {
        setError(t("generic"));
        return;
      }

      router.push(safeNext(next));
      router.refresh();
    } catch {
      setError(t("generic"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <AuthField id="email" type="email" label={t("email")} autoComplete="email" />
      <AuthField
        id="password"
        type="password"
        label={t("password")}
        autoComplete="current-password"
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

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
