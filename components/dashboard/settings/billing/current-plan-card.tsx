import { ShieldCheck } from "lucide-react";
import { PlanActions } from "./plan-actions";

const COPY: Record<string, { title: string; text: string }> = {
  active: {
    title: "Subscrição ativa",
    text: "O agente de IA e as notas de voz estão disponíveis.",
  },
  trialing: {
    title: "Período de teste",
    text: "Escolha um plano antes do fim do teste para manter o agente ligado.",
  },
  past_due: {
    title: "Pagamento em atraso",
    text: "O agente de IA está desligado até o pagamento ser regularizado.",
  },
  canceled: {
    title: "Subscrição cancelada",
    text: "O agente de IA está desligado. Escolha um plano para o reativar.",
  },
};

export function CurrentPlanCard({
  subStatus,
  plan,
  trialEndsAt,
  msLeft,
  canManage,
  hasBillingAccount,
}: {
  subStatus: string;
  plan: string | null;
  trialEndsAt: string | null;
  msLeft: number | null;
  canManage: boolean;
  hasBillingAccount: boolean;
}) {
  const copy = COPY[subStatus] ?? COPY.canceled;
  const end = trialEndsAt ? new Date(trialEndsAt) : null;
  const detail =
    subStatus === "trialing" && end
      ? (msLeft ?? 0) > 0
        ? `Termina a ${end.toLocaleDateString("pt-PT")}. ${copy.text}`
        : "O período de teste terminou: o agente de IA está desligado."
      : copy.text;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
              Plano atual
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {copy.title}
              {plan ? ` · ${plan}` : ""}
            </p>
            <p className="mt-1 text-sm text-white/50">{detail}</p>
          </div>
        </div>

        <PlanActions canManage={canManage} subStatus={subStatus} hasBillingAccount={hasBillingAccount} />
      </div>
    </div>
  );
}
