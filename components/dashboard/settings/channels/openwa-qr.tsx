"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, QrCode, Smartphone, Unplug } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

// WhatsApp por QR Code (OpenWA, não oficial): cria a sessão da organização, mostra o QR e faz polling do estado
// (a cada 3 s, só enquanto o QR está no ecrã) até o telemóvel ler e passar a "Conectado".

type State = "none" | "connecting" | "open" | "close";

const ERRORS: Record<string, string> = {
  not_configured: "O servidor do OpenWA ainda não está configurado (OPENWA_URL e OPENWA_API_KEY).",
  meta_already_connected: "Já tem um número ligado pela API oficial. Desligue-o primeiro: só um WhatsApp de cada vez.",
  openwa_unreachable: "Não conseguimos falar com o servidor do OpenWA. Tente novamente dentro de instantes.",
  openwa_error: "O servidor do OpenWA recusou o pedido. Tente novamente.",
  subscription_required: "Ative o seu plano para ligar novos canais.",
  forbidden: "Apenas o proprietário ou um gestor pode ligar canais.",
  rate_limited: "Demasiadas tentativas. Aguarde alguns minutos.",
};

const POLL_MS = 3000;

export function OpenWaQr({ initiallyConnected }: { initiallyConnected: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>(initiallyConnected ? "open" : "none");
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const apply = useCallback(
    (data: { state?: State; qr?: string | null }) => {
      if (!alive.current) return;
      setState(data.state ?? "connecting");
      setQr(data.qr ?? null);
      if (data.state === "open") router.refresh();
    },
    [router],
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp-qr/status", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        apply(data);
        if (data.state === "open") return; // ligado: acaba o polling
      } else if (res.status === 404) {
        if (alive.current) setState("none");
        return;
      }
    } catch {
      /* falha de rede: tenta de novo */
    }
    if (alive.current) timer.current = setTimeout(poll, POLL_MS);
  }, [apply]);

  // Se a página abre com uma sessão a meio (QR por ler), retoma o polling.
  useEffect(() => {
    if (!initiallyConnected) void fetch("/api/whatsapp-qr/status", { cache: "no-store" }).then((r) => r.ok && void poll());
  }, [initiallyConnected, poll]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp-qr/connect", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível iniciar a ligação.");
        return;
      }
      apply(data);
      if (data.state !== "open") timer.current = setTimeout(poll, POLL_MS);
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Desligar este WhatsApp? Deixa de receber e responder mensagens por este número.")) return;
    setBusy(true);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await fetch("/api/whatsapp-qr/disconnect", { method: "POST" });
      if (!res.ok) {
        setError(ERRORS.openwa_error);
        return;
      }
      setState("none");
      setQr(null);
      router.refresh();
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const label = state === "open" ? "Conectado" : state === "connecting" ? (qr ? "A ler QR" : "A preparar…") : "Desconectado";
  const tone = state === "open" ? "bg-emerald-500/15 text-emerald-300" : state === "connecting" ? "bg-amber-500/15 text-amber-300" : "bg-white/10 text-white/60";

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-white/70" />
          <h2 className="text-base font-semibold">WhatsApp por QR Code</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>
      </div>

      {state === "connecting" && (
        <div className="flex flex-col items-center gap-3">
          {qr ? (
            // data URL gerada pelo OpenWA: não passa pelo otimizador de imagens.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR Code do WhatsApp" className="h-64 w-64 rounded-xl bg-white p-3" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          )}
          <p className="max-w-sm text-center text-sm text-white/60">
            No telemóvel: WhatsApp → Definições → Dispositivos ligados → Ligar um dispositivo, e aponte para este código.
            O código renova-se sozinho.
          </p>
        </div>
      )}

      {state === "open" && (
        <p className="text-sm text-white/70">O número está ligado. As mensagens chegam à Inbox e o agente responde com pausas e “a escrever…” como uma pessoa.</p>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {state !== "open" && (
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            {state === "connecting" ? "Gerar novo QR" : "Conectar WhatsApp"}
          </button>
        )}
        {(state === "open" || state === "connecting") && (
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-60"
          >
            <Unplug className="h-4 w-4" />
            Desligar
          </button>
        )}
      </div>

      <p className="text-xs text-white/40">
        Canal não oficial: usa a sessão do WhatsApp Web do seu telemóvel. O WhatsApp pode restringir números que se
        comportem como robôs. Responda a quem lhe escreve e evite envios em massa.
      </p>
    </div>
  );
}
