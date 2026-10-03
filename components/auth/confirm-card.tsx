"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// O passo de "carregar para continuar" dos links de e-mail. O link em si (GET) não consome nada: só este botão
// (POST) o faz. Assim os antivírus e pré-visualizadores de e-mail, que abrem os links, não gastam o token.
export function ConfirmCard({ type, tokenHash, next }: { type: "signup" | "recovery"; tokenHash: string; next?: string }) {
  const t = useTranslations("Auth.confirm");
  const router = useRouter();
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function confirm() {
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_hash: tokenHash, type, next, locale }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(true);
        setPending(false);
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{type === "signup" ? t("signupBody") : t("recoveryBody")}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t("invalid")}
        </p>
      )}
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="neon-green-btn flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("working") : type === "signup" ? t("signupButton") : t("recoveryButton")}
      </button>
    </div>
  );
}
