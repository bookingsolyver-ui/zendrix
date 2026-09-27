import { AlertTriangle } from "lucide-react";

export function MobileWarning() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Você está no celular. No telefone, a janela da Meta costuma fechar antes de terminar a
        ligação — prefira usar um computador, ou peça para receber o link por e-mail e abra-o
        mais tarde num ecrã maior.
      </p>
    </div>
  );
}
