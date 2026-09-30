import { CreditCard } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export function PaymentMethodCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Método de Pagamento</h2>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <CreditCard className="h-5 w-5 text-white/60" />
          </span>
          <p className="text-sm text-white/50">Nenhum método de pagamento associado.</p>
        </div>

        <SoonButton
          feature="Adicionar cartão"
          className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]"
        >
          Adicionar cartão
        </SoonButton>
      </div>
    </div>
  );
}
