"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

export function ConnectButtons() {
  const router = useRouter();
  const [sentVia, setSentVia] = useState<"whatsapp" | "email" | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.error === "token_expired") {
        setIsConnecting(false);
        alert("O token da Meta expirou. Atualize-o em «Token da Meta», nesta página.");
        return;
      }
      if (!res.ok || !data?.success) throw new Error("meta-error");
      localStorage.setItem("zetrix_wa_connected", "true");
      router.push("/dashboard");
    } catch {
      setIsConnecting(false);
      alert("Erro ao conectar à Meta");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleConnect}
          disabled={isConnecting}
          className="neon-green-btn flex flex-1 items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400"
        >
          {isConnecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WhatsAppGlyph className="h-4 w-4" />
          )}
          {isConnecting ? "A conectar..." : "Receber o link no WhatsApp"}
        </button>
        <button
          type="button"
          onClick={() => setSentVia("email")}
          className="glow-border flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
        >
          <Mail className="h-4 w-4" />
          Receber por e-mail
        </button>
      </div>

      {sentVia && (
        <p className="flex items-center gap-2 text-sm text-neon-green">
          <CheckCircle2 className="h-4 w-4" />
          {sentVia === "whatsapp"
            ? "Link enviado! Abra a janela da Meta para concluir a ligação."
            : "Enviámos o link para o seu e-mail registado."}
        </p>
      )}
    </div>
  );
}
