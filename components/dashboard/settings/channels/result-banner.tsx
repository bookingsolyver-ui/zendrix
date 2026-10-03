import { AlertCircle, CheckCircle2 } from "lucide-react";

const ERRORS: Record<string, string> = {
  denied: "Cancelou a autorização no Facebook. Nada foi ligado.",
  invalid_state: "O pedido expirou ou não é válido. Volte a carregar em «Ligar conta».",
  invalid_request: "Pedido inválido. Volte a tentar.",
  session_expired: "A sessão expirou. Inicie sessão e tente de novo.",
  forbidden: "Apenas o proprietário ou um gestor pode ligar canais.",
  subscription_required: "Ative o seu plano para ligar novos canais.",
  rate_limited: "Demasiadas tentativas. Aguarde alguns minutos.",
  not_configured: "A ligação com a Meta ainda não está configurada nesta instalação. Contacte o suporte.",
  no_pages: "Não encontrámos nenhuma página do Facebook a que tenha dado acesso. Escolha as páginas na janela da Meta.",
  no_instagram: "As páginas escolhidas não têm uma conta profissional de Instagram ligada.",
  meta_error: "A Meta recusou o pedido. Tente novamente dentro de instantes.",
  server_error: "Algo correu mal do nosso lado. Tente novamente.",
};

const NAMES: Record<string, string> = { instagram: "Instagram", messenger: "Messenger" };

// O resultado do fluxo OAuth, vindo no URL (?connected=...&count=...&conflicts=...&subscribe=failed | ?error=...).
export function ResultBanner({ params }: { params: Record<string, string | undefined> }) {
  if (params.error) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {ERRORS[params.error] ?? ERRORS.server_error}
      </div>
    );
  }
  if (!params.connected || !NAMES[params.connected]) return null;

  const count = Number(params.count) || 0;
  const conflicts = Number(params.conflicts) || 0;
  return (
    <div role="status" className="space-y-1 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
      <p className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {count > 0
          ? `${NAMES[params.connected]} ligado: ${count === 1 ? "1 conta" : `${count} contas`}.`
          : `Nenhuma conta nova foi ligada ao ${NAMES[params.connected]}.`}
      </p>
      {conflicts > 0 && (
        <p className="pl-7 text-amber-200">
          {conflicts === 1 ? "1 conta já está" : `${conflicts} contas já estão`} ligada(s) a outra organização e não foi alterada.
        </p>
      )}
      {params.subscribe === "failed" && (
        <p className="pl-7 text-amber-200">
          Não conseguimos ativar a receção de mensagens de alguma página. Volte a ligar a conta e aceite todas as permissões.
        </p>
      )}
    </div>
  );
}
