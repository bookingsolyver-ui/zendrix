import { Smartphone } from "lucide-react";

export function WhatsappEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Smartphone className="h-7 w-7 text-white/50" />
      </span>

      <h2 className="mt-6 text-[18px] font-normal text-white">Comece conectando seu WhatsApp</h2>
      <p className="mt-2 max-w-md text-[14px] text-white/40">
        Conecte seu número WhatsApp Business para começar a enviar mensagens, criar automações e
        gerenciar seus contatos.
      </p>

      <button
        type="button"
        className="neon-green-btn mt-6 flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400"
      >
        <Smartphone className="h-4 w-4" />
        Conectar WhatsApp
      </button>
    </div>
  );
}
