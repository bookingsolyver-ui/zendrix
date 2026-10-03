"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";

const DISMISS_KEY = "zetrix_trial_banner_dismissed";

export function TrialBanner({
  subStatus,
  msLeft,
}: {
  subStatus: string;
  msLeft: number | null;
}) {
  // Hidden for the rest of the browser session once dismissed ("remind me later").
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Só aparece durante o teste. Com subscrição ativa não há nada a vender.
  if (subStatus !== "trialing") return null;

  const expired = msLeft !== null && msLeft <= 0;
  const daysLeft =
    msLeft === null ? null : Math.max(0, Math.ceil(msLeft / 86_400_000));
  // Um teste expirado bloqueia o agente: o aviso não se pode dispensar.
  if (dismissed && !expired) return null;

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable: hide for this render only
    }
    setDismissed(true);
  }

  return (
    <div className="-mx-4 -mt-6 mb-6 flex flex-col gap-3 border-b border-white/10 px-4 py-3 text-white sm:-mx-6 sm:-mt-8 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-white/40" />
        {expired
          ? "O seu período de teste terminou: o agente de IA está desligado. Escolha um plano para o reativar."
          : daysLeft === null
            ? "Está no período de teste. Escolha o plano ideal para a sua equipa."
            : `Período de teste: ${daysLeft} ${daysLeft === 1 ? "dia restante" : "dias restantes"}.`}
      </span>

      <div className="flex items-center gap-2">
        {!expired && (
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/5"
          >
            Lembrar mais tarde
          </button>
        )}
        <Link
          href="/dashboard/settings/billing"
          className="rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400"
        >
          Escolher plano
        </Link>
      </div>
    </div>
  );
}
