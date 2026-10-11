"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
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
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ? t("callbackError") : null);
  // E-mail por confirmar: não é "palavra-passe errada". Explica-se e oferece-se o reenvio (com espera de 60 s).
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!unconfirmedEmail || cooldown > 0) return;
    setCooldown(60);
    setResendMsg(null);
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unconfirmedEmail, locale }),
      });
      setResendMsg(res.ok ? { ok: true, text: t("resendSent") } : { ok: false, text: res.status === 429 ? t("rateLimited") : t("generic") });
    } catch {
      setResendMsg({ ok: false, text: t("generic") });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const form = new FormData(event.currentTarget);
    setIsLoading(true);
    setError(null);
    setUnconfirmedEmail(null);
    setResendMsg(null);

    try {
      const supabase = createClient();
      const email = String(form.get("email") ?? "").trim();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: String(form.get("password") ?? ""),
      });
      if (signInError) {
        if (signInError.code === "email_not_confirmed") {
          setUnconfirmedEmail(email);
          setError(t("unconfirmed"));
        } else if (signInError.status === 429 || signInError.code === "over_request_rate_limit") {
          setError(t("rateLimited"));
        } else if (signInError.code === "invalid_credentials" || signInError.status === 400) {
          setError(t("invalid"));
        } else {
          setError(t("generic"));
        }
        return;
      }

      // Safety net: creates the User + Workspace rows if registration only got halfway.
      const res = await fetch("/api/auth/provision", { method: "POST" });
      if (!res.ok) {
        setError(t("generic"));
        return;
      }

      // Conta por aprovar (ou rejeitada): vai direto à página que o explica e que se atualiza sozinha.
      const provisioned = await res.json().catch(() => null);
      if (provisioned?.restriction === "pending_approval" || provisioned?.restriction === "rejected") {
        router.push("/pending-approval");
        router.refresh();
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
      <div className="-mt-1 text-right">
        <Link href="/forgot-password" className="text-xs text-muted hover:text-foreground">
          {t("forgot")}
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {unconfirmedEmail && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="text-sm font-medium text-neon-green hover:text-neon-green-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cooldown > 0 ? t("resendWait", { seconds: cooldown }) : t("resend")}
          </button>
          {resendMsg && (
            <p role="status" className={`text-sm ${resendMsg.ok ? "text-neon-green" : "text-danger"}`}>
              {resendMsg.text}
            </p>
          )}
        </div>
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
