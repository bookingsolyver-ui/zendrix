import { Lock } from "lucide-react";
import { PAYWALL_MESSAGE, type AccessReason } from "@/lib/billing/policy";

// O aviso de "precisa de ativar o plano", no topo da faturação. É para onde o paywall manda quem não tem plano.
export function PaywallNotice({ reason, redirected }: { reason: AccessReason; redirected: boolean }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div>
        <p className="font-semibold">
          {redirected ? "Ative o plano para continuar." : "O seu plano não está ativo."}
        </p>
        <p className="mt-1 text-amber-100/80">{PAYWALL_MESSAGE[reason]}</p>
        <p className="mt-1 text-xs text-amber-100/60">
          As configurações e a faturação continuam sempre disponíveis. Os seus dados e conversas ficam guardados.
        </p>
      </div>
    </div>
  );
}
