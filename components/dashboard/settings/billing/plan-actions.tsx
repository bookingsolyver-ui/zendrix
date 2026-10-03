"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import {
  BILLING_PROVIDERS,
  PORTAL_PROVIDER,
  isProviderAvailable,
  type BillingProviderId,
} from "./billing-providers";
import { useBillingRedirect } from "./use-billing-redirect";

// A ação principal do cartão do plano. Quem já paga (ou deve) gere no portal; quem ainda não subscreveu
// escolhe o método de pagamento e vai para o Checkout. STAFF não vê botões: só OWNER e MANAGER.
export function PlanActions({
  canManage,
  subStatus,
  hasBillingAccount,
}: {
  canManage: boolean;
  subStatus: string;
  hasBillingAccount: boolean;
}) {
  const { go, pending, error } = useBillingRedirect();
  const [providerId, setProviderId] = useState<BillingProviderId>(
    () => BILLING_PROVIDERS.find(isProviderAvailable)!.id,
  );

  if (!canManage) {
    return (
      <p className="max-w-[16rem] text-sm text-white/40 sm:text-right">
        Apenas o proprietário ou um gestor pode alterar a subscrição.
      </p>
    );
  }

  const manage = hasBillingAccount && (subStatus === "active" || subStatus === "past_due");
  const provider = BILLING_PROVIDERS.find((p) => p.id === providerId)!;
  const endpoint = manage ? PORTAL_PROVIDER.portalEndpoint : provider.checkoutEndpoint;
  const label = manage
    ? subStatus === "past_due"
      ? "Regularizar pagamento"
      : "Gerir subscrição"
    : "Subscrever";
  const busy = pending !== null;

  return (
    <div className="flex flex-col gap-3 sm:items-end">
      {!manage && BILLING_PROVIDERS.length > 1 && (
        <div role="radiogroup" aria-label="Método de pagamento" className="flex flex-wrap gap-2 sm:justify-end">
          {BILLING_PROVIDERS.map((p) => {
            const available = isProviderAvailable(p);
            const selected = p.id === providerId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!available || busy}
                onClick={() => setProviderId(p.id)}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed ${
                  selected
                    ? "border-emerald-400/60 bg-emerald-500/10 text-white"
                    : "border-white/10 text-white/60 enabled:hover:border-white/25"
                } ${!available ? "opacity-50" : ""}`}
              >
                <span className="block font-medium">{p.name}</span>
                <span className="block text-white/40">
                  {p.currencies.join(" · ")}
                  {!available && " · Em breve"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={busy || !endpoint}
        onClick={() => endpoint && go(endpoint, manage ? "portal" : "checkout")}
        className="neon-btn flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "A redirecionar…" : label}
        {!busy && <ArrowUpRight className="h-4 w-4" />}
      </button>

      {error && (
        <p role="alert" className="max-w-[18rem] text-sm text-red-400 sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
