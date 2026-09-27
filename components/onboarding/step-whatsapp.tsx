import { Layers, ShoppingCart, Smartphone } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";
import { SummaryCard } from "@/components/dashboard/billing/summary-card";
import { WhatsAppTopLinks } from "@/components/dashboard/whatsapp/top-links";
import { DedicatedNumberSection } from "@/components/whatsapp/dedicated-number-section";

export function StepWhatsApp({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <div>
      <WhatsAppTopLinks />

      <div className="mt-6 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10 ring-1 ring-[#25D366]/30">
          <WhatsAppGlyph className="h-8 w-8 text-[#25D366]" />
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          Agora, conecte o WhatsApp
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Ligue o seu número de WhatsApp Business à Zentrix em poucos passos.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={Smartphone}
          label="Números conectados"
          value="0"
          hint="Nenhum número ligado ainda"
        />
        <SummaryCard
          icon={Layers}
          label="Vagas do plano"
          value="0 / 3"
          hint="vagas livres no plano Pro"
          accent
        />
      </div>

      <div className="mt-6">
        <DedicatedNumberSection />
      </div>

      <a
        href="#comprar-numero"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ShoppingCart className="h-4 w-4" />
        Não tem um número? Comprar número
      </a>

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="neon-btn rounded-full px-8 py-3 text-sm font-semibold text-background"
        >
          Ir para o Dashboard
        </button>
      </div>
    </div>
  );
}
