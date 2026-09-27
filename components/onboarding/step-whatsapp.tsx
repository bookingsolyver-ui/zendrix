"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Phone } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

export function StepWhatsApp({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: () => void;
}) {
  const [linkSent, setLinkSent] = useState(false);

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10 ring-1 ring-[#25D366]/30">
          <WhatsAppGlyph className="h-8 w-8 text-[#25D366]" />
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          Agora, conecte o WhatsApp
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Abra a janela oficial da Meta para ligar o seu número de WhatsApp Business à
          Zentrix em poucos passos.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-3">
        <button
          type="button"
          onClick={() => setLinkSent(true)}
          className="neon-green-btn flex w-full items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3.5 text-sm font-semibold text-background hover:bg-green-400"
        >
          <WhatsAppGlyph className="h-4 w-4" />
          Receber o link no WhatsApp
        </button>

        {linkSent && (
          <p className="flex items-center justify-center gap-2 text-sm text-neon-green">
            <CheckCircle2 className="h-4 w-4" />
            Link enviado! Abra a janela da Meta para concluir a ligação.
          </p>
        )}

        <button
          type="button"
          className="glow-border flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
        >
          <Phone className="h-4 w-4" />
          Comprar um número dedicado
        </button>

        <a
          href="#agendar-call"
          className="flex items-center justify-center gap-2 py-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <Calendar className="h-4 w-4" />
          Agendar uma call de implantação
        </a>
      </div>

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
