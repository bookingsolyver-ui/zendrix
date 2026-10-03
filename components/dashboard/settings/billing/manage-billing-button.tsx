"use client";

import { Loader2 } from "lucide-react";
import { PORTAL_PROVIDER } from "./billing-providers";
import { useBillingRedirect } from "./use-billing-redirect";

// Abre o portal de faturação (método de pagamento, faturas, cancelar). Só para quem pode geri-lo.
export function ManageBillingButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { go, pending, error } = useBillingRedirect();
  const endpoint = PORTAL_PROVIDER.portalEndpoint;
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <button
        type="button"
        disabled={pending !== null || !endpoint}
        onClick={() => endpoint && go(endpoint, "portal")}
        className={`${className ?? ""} flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "A redirecionar…" : children}
      </button>
      {error && (
        <p role="alert" className="max-w-[18rem] text-sm text-red-400 sm:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
