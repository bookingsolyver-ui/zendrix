import { ShoppingCart } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export function PurchaseSection() {
  return (
    <section>
      <h2 className="text-lg font-semibold">Não tem um número para conectar?</h2>
      <p className="mt-1 text-sm text-muted">
        Compre um número dedicado, já pronto para ligar à API do WhatsApp.
      </p>

      <div className="glow-border mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2">
            <ShoppingCart className="h-5 w-5 text-neon-green" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Número dedicado Zentrix</h3>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Já validado e pronto para ligar à API, sem burocracia.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="text-lg font-semibold text-foreground">
            R$ 49,90<span className="text-sm font-normal text-muted">/mês</span>
          </p>
          <SoonButton feature="Comprar número"
            type="button"
            className="neon-btn rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Comprar número
          </SoonButton>
        </div>
      </div>
    </section>
  );
}
