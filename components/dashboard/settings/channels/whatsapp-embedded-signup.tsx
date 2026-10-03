"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { isFacebookOrigin, parseEmbeddedSession } from "@/lib/validations/meta-embedded";

// WhatsApp Embedded Signup: abre o popup da Meta para o cliente ligar o SEU número, sem copiar tokens.
//   1. FB.login devolve um `code` (config_id = a configuração criada no painel da Meta).
//   2. O popup avisa-nos (postMessage) do id da conta WhatsApp Business e do número.
//   3. Enviamos code + ids ao servidor, que os confirma na Graph API e guarda a ligação.
// O `code` e a mensagem chegam em ordem não garantida: só se avança quando se tem os dois.

interface FbLoginResponse {
  authResponse?: { code?: string } | null;
}
interface FbSdk {
  init(options: Record<string, unknown>): void;
  login(callback: (response: FbLoginResponse) => void, options: Record<string, unknown>): void;
}
declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

const ERRORS: Record<string, string> = {
  not_configured: "A ligação com a Meta ainda não está configurada.",
  invalid_code: "A autorização expirou. Tente novamente.",
  not_your_number: "Não conseguimos confirmar que este número é seu.",
  waba_mismatch: "Este número não pertence à conta WhatsApp Business indicada.",
  conflict: "Este número já está ligado a outra organização.",
  meta_error: "A Meta não respondeu. Tente novamente dentro de instantes.",
  subscription_required: "Ative o seu plano para ligar novos canais.",
  forbidden: "Apenas o proprietário ou um gestor pode ligar canais.",
  rate_limited: "Demasiadas tentativas. Aguarde alguns minutos.",
};

type Phase = "idle" | "popup" | "saving";

export function WhatsAppEmbeddedSignup({
  appId,
  configId,
  graphVersion,
  className,
  label,
}: {
  appId: string;
  configId: string;
  graphVersion: string;
  className: string;
  label: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const code = useRef<string | null>(null);
  const session = useRef<{ wabaId: string; phoneNumberId: string } | null>(null);

  // Carrega o SDK do Facebook uma vez.
  useEffect(() => {
    if (window.FB) return;
    window.fbAsyncInit = () => window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
    if (document.getElementById("facebook-jssdk")) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(script);
  }, [appId, graphVersion]);

  const finish = useCallback(async () => {
    if (!code.current || !session.current) return; // falta uma das duas metades
    const payload = { code: code.current, ...session.current };
    code.current = null;
    session.current = null;
    setPhase("saving");
    try {
      const res = await fetch("/api/meta/whatsapp/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível ligar o número. Tente novamente.");
      } else {
        setNotice(
          `${data.phoneNumber ?? "Número"} ligado.` +
            (data.subscribed ? "" : " Não conseguimos ativar a receção de mensagens: volte a ligar e aceite todas as permissões."),
        );
        router.refresh();
      }
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setPhase("idle");
    }
  }, [router]);

  // A mensagem do popup com os ids. Só se aceita do Facebook.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isFacebookOrigin(event.origin)) return;
      const ids = parseEmbeddedSession(event.data);
      if (!ids) return;
      session.current = ids;
      void finish();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [finish]);

  function start() {
    setError(null);
    setNotice(null);
    code.current = null;
    session.current = null;
    if (!window.FB) {
      setError("O Facebook ainda não carregou. Tente novamente dentro de instantes.");
      return;
    }
    setPhase("popup");
    window.FB.login(
      (response) => {
        const authCode = response.authResponse?.code;
        if (!authCode) {
          // Fechou o popup ou recusou.
          setPhase("idle");
          return;
        }
        code.current = authCode;
        void finish();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }

  const busy = phase !== "idle";
  return (
    <div>
      <button type="button" onClick={start} disabled={busy} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {phase === "saving" ? "A ligar o número…" : phase === "popup" ? "À espera da Meta…" : label}
        {!busy && <ArrowUpRight className="h-4 w-4" />}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}
    </div>
  );
}
