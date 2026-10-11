"use client";

import { useCallback, useEffect, useState } from "react";
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

export function OpenWaQr({
  initiallyConnected,
  officialChannel = null,
}: {
  initiallyConnected: boolean;
  officialChannel?: { id: string; idTail: string } | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>(initiallyConnected ? "open" : "none");
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Canal oficial da Meta que bloqueia o QR: desligá-lo liberta o painel no mesmo instante.
  const [official, setOfficial] = useState(officialChannel);
  const [confirmOfficial, setConfirmOfficial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // O polling é um efeito ligado a `polling`: liga-se quando há um QR por ler e desliga-se ao ligar, desligar
  // ou sair da página (o cleanup cancela o temporizador e ignora respostas atrasadas).
  const [polling, setPolling] = useState(false);

  const apply = useCallback(
    (data: { state?: State; qr?: string | null }) => {
      setState(data.state ?? "connecting");
      setQr(data.qr ?? null);
      if (data.state === "open") router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!polling) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const res = await fetch("/api/whatsapp-qr/status", { cache: "no-store" });
        if (stopped) return;
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          apply(data);
          if (data.state === "open") return setPolling(false); // ligado: acaba o polling
        } else if (res.status === 404) {
          setState("none");
          return setPolling(false);
        }
      } catch {
        /* falha de rede: tenta de novo */
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    }
    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [polling, apply]);

  // Se a página abre com uma sessão a meio (QR por ler), retoma o polling.
  useEffect(() => {
    if (initiallyConnected) return;
    let cancelled = false;
    void fetch("/api/whatsapp-qr/status", { cache: "no-store" }).then((res) => {
      if (!cancelled && res.ok) setPolling(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initiallyConnected]);

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
      setPolling(data.state !== "open");
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectOfficial() {
    if (!official) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/channels/${official.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(res.status === 404 ? "Este canal já não existe." : (ERRORS[data?.error] ?? "Não foi possível desligar o canal oficial. Tente novamente."));
        return;
      }
      setOfficial(null); // painel livre já: o botão «Conectar WhatsApp» aparece sem recarregar
      setConfirmOfficial(false);
      router.refresh();
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
    setPolling(false);
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

      {official && (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            Tem um número ligado pela <strong>API oficial da Meta</strong> (…{official.idTail}). Só é permitido um canal de
            WhatsApp de cada vez: para usar o QR Code, desligue primeiro o canal oficial. As conversas e mensagens ficam
            guardadas.
          </p>
          {confirmOfficial ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={disconnectOfficial}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                Sim, desligar canal oficial
              </button>
              <button type="button" onClick={() => setConfirmOfficial(false)} disabled={busy} className="text-sm text-white/60 hover:text-white">
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOfficial(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-200 hover:bg-red-500/10"
            >
              <Unplug className="h-4 w-4" />
              Desligar / remover canal oficial
            </button>
          )}
        </div>
      )}

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
        {state !== "open" && !official && (
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
