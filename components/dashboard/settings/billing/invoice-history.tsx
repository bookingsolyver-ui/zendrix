import { ManageBillingButton } from "./manage-billing-button";

// As faturas vivem no portal do Stripe (histórico, PDF, dados de faturação): é de lá que se descarregam.
export function InvoiceHistory({
  canManage = false,
  hasBillingAccount = false,
}: {
  canManage?: boolean;
  hasBillingAccount?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Histórico de Faturas</h2>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-5 py-8 text-center">
        <p className="text-sm text-white/50">
          {hasBillingAccount
            ? "As suas faturas estão no portal de faturação, onde pode também descarregá-las em PDF."
            : "Ainda não existem faturas emitidas. Aparecem aqui assim que subscrever."}
        </p>
        {hasBillingAccount && canManage && (
          <div className="mt-4 flex justify-center">
            <ManageBillingButton className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]">
              Ver faturas no portal
            </ManageBillingButton>
          </div>
        )}
      </div>
    </div>
  );
}
