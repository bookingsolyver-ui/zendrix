import { AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CHANNEL_LABEL } from "@/lib/inbox/channels";
import { getExpiredChannels } from "@/lib/meta/integration-health";
import { qrChannelHealth } from "@/lib/openwa/service";

// Aviso global (em todo o dashboard) quando a Meta recusou o token de algum canal: enquanto não se voltar a
// ligar, as respostas dessa conta NÃO estão a ser enviadas. Só aparece se houver algo para resolver.
export async function ChannelsHealthBanner({ workspaceId }: { workspaceId: string | undefined }) {
  if (!workspaceId) return null;
  const [expired, qr] = await Promise.all([
    getExpiredChannels(workspaceId).catch(() => []),
    qrChannelHealth(workspaceId).catch(() => "none" as const),
  ]);
  // WhatsApp por QR: ligação perdida (telemóvel desligado ou sessão apagada) ou servidor OpenWA inacessível. Só avisa;
  // nunca bloqueia o resto do painel (o texto segue para a fila e as tentativas falham de forma visível na Inbox).
  if ((qr === "lost" || qr === "unreachable") ) {
    return (
      <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
        <p className="min-w-0 flex-1">
          {qr === "lost" ? (
            <>
              <strong className="font-semibold">A ligação do WhatsApp por QR Code foi perdida.</strong> As mensagens não estão a ser
              enviadas nem recebidas até voltar a ler o código.
            </>
          ) : (
            <>
              <strong className="font-semibold">Não conseguimos falar com o servidor do WhatsApp (OpenWA).</strong> As mensagens podem
              atrasar-se; tentamos de novo automaticamente.
            </>
          )}
        </p>
        <Link
          href="/dashboard/settings/whatsapp-qr"
          className="shrink-0 rounded-full border border-amber-300/50 px-4 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/10"
        >
          {qr === "lost" ? "Voltar a ligar" : "Ver estado"}
        </Link>
      </div>
    );
  }
  if (expired.length === 0) return null;

  const names = expired.map((channel) => CHANNEL_LABEL[channel.platform]).join(", ");
  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">O acesso ao {names} expirou.</strong> As respostas nesse canal não estão a ser
        enviadas até voltar a ligar a conta.
      </p>
      <Link
        href="/dashboard/settings/channels"
        className="shrink-0 rounded-full border border-amber-300/50 px-4 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/10"
      >
        Voltar a ligar
      </Link>
    </div>
  );
}
