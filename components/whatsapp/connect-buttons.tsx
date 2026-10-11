"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

// A API oficial da Meta é UM dos dois canais de WhatsApp (o outro é o QR Code). Uma falha aqui NUNCA bloqueia a
// página: mostra-se uma mensagem no próprio cartão, nada de alertas do browser, e o canal por QR segue independente.
const MESSAGES: Record<string, string> = {
  no_integration: "Ainda não há um número ligado pela API oficial da Meta. Pode ligá-lo em Canais ou usar o QR Code.",
  token_expired: "O token da Meta expirou. Atualize-o em «Token da Meta», nesta página.",
  subscription_required: "Ative o seu plano para ligar novos canais.",
  forbidden: "Apenas o proprietário ou um gestor pode ligar canais.",
  unauthenticated: "A sua sessão terminou. Inicie sessão novamente.",
  integration_unreadable: "Não conseguimos ler as credenciais guardadas. Volte a ligar o número.",
};

export function ConnectButtons() {
  const router = useRouter();
  const [sentVia, setSentVia] = useState<"whatsapp" | "email" | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        // `error` pode ser um texto (os nossos códigos) ou um objeto da Meta: só os códigos nossos são mostrados.
        const code = typeof data?.error === "string" ? data.error : "";
        setError(MESSAGES[code] ?? "Não foi possível verificar a ligação à Meta neste momento. Tente novamente mais tarde.");
        return;
      }
      localStorage.setItem("kwanza_wa_connected", "true");
      router.push("/dashboard");
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setIsConnecting(false);
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
          {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WhatsAppGlyph className="h-4 w-4" />}
          {isConnecting ? "A verificar..." : "Verificar ligação à Meta"}
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

      {error && (
        <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p>{error}</p>
          <Link href="/dashboard/settings/whatsapp-qr" className="mt-1 inline-block text-xs font-medium text-neon-green hover:text-neon-green-2">
            Ligar o WhatsApp por QR Code (não precisa da Meta)
          </Link>
        </div>
      )}

      {sentVia && (
        <p className="flex items-center gap-2 text-sm text-neon-green">
          <CheckCircle2 className="h-4 w-4" />
          Enviámos o link para o seu e-mail registado.
        </p>
      )}
    </div>
  );
}
