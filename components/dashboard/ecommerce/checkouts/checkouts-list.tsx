import { Clock } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";
import { ABANDONED_CHECKOUTS } from "@/components/dashboard/ecommerce/checkouts/checkouts-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";

export function CheckoutsList() {
  if (ABANDONED_CHECKOUTS.length === 0) {
    return (
      <MarketingEmptyState
        icon={Clock}
        title="Nenhum checkout abandonado"
        description="Os carrinhos abandonados pelos seus clientes vão aparecer aqui."
      />
    );
  }

  return (
    <div className="space-y-3">
      {ABANDONED_CHECKOUTS.map((checkout) => (
        <div
          key={checkout.id}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium text-white">
              {checkout.customer ?? "Cliente Anónimo"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
              <Clock className="h-3.5 w-3.5" />
              {checkout.timeAgo}
            </p>
          </div>

          <div className="flex items-center gap-5">
            <p className="text-base font-semibold text-white">{checkout.amount}</p>
            <button
              type="button"
              className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-4 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
            >
              <WhatsAppGlyph className="h-4 w-4" />
              Recuperar via WhatsApp
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
