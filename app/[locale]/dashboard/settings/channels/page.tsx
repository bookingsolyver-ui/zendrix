import { setRequestLocale } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ChannelCard, type ChannelAction } from "@/components/dashboard/settings/channels/channel-card";
import { ResultBanner } from "@/components/dashboard/settings/channels/result-banner";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getChannelsStatus } from "@/lib/meta/channels-status";
import { graphVersion, metaOAuthConfig } from "@/lib/meta/oauth";
import { WhatsAppEmbeddedSignup } from "@/components/dashboard/settings/channels/whatsapp-embedded-signup";
import { evaluateAccess } from "@/lib/billing/policy";

export default async function ChannelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;

  const user = await getCurrentUser();
  // Só OWNER e MANAGER ligam canais (a rota OAuth também o exige: isto só decide o que se mostra).
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const status = await getChannelsStatus(user?.workspace?.id);
  const metaReady = metaOAuthConfig() !== null;
  // PAYWALL: sem plano ativo não se ligam canais novos (a rota OAuth também recusa).
  const planActive = user?.workspace
    ? evaluateAccess(user.workspace.subStatus, user.workspace.trialEndsAt ? new Date(user.workspace.trialEndsAt) : null).active
    : true;

  // Instagram e Messenger: Facebook Login. O botão é um link para a nossa rota, que gera o `state` e
  // redireciona para o Facebook com o App ID e as permissões.
  const oauthAction = (platform: "instagram" | "messenger", connected: boolean): ChannelAction => {
    if (!canManage) {
      return { kind: "disabled", label: "Ligar conta", reason: "Apenas o proprietário ou um gestor pode ligar canais." };
    }
    if (!planActive) {
      return { kind: "disabled", label: "Ligar conta", reason: "Ative o seu plano em Faturação para ligar novos canais." };
    }
    if (!metaReady) {
      return { kind: "disabled", label: "Ligar conta", reason: "Indisponível: a app da Meta ainda não está configurada." };
    }
    return {
      kind: "link",
      node: (className) => (
        <a href={`/api/meta/oauth/start?platform=${platform}&locale=${locale}`} className={className}>
          {connected ? "Ligar outra conta" : "Ligar conta"}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      ),
    };
  };

  // WhatsApp: com NEXT_PUBLIC_META_WA_CONFIG_ID (Embedded Signup configurado na Meta) o cliente liga o número num
  // popup, sem copiar tokens. Sem ele (ou como alternativa) fica o ecrã próprio, com número, token e Phone ID.
  const waConfigId = process.env.NEXT_PUBLIC_META_WA_CONFIG_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_META_APP_ID?.trim();
  const hasWhatsApp = status.WHATSAPP.length > 0;
  const whatsappAction: ChannelAction = !planActive
    ? { kind: "disabled", label: "Ligar conta", reason: "Ative o seu plano em Faturação para ligar novos canais." }
    : !canManage
      ? { kind: "disabled", label: "Ligar conta", reason: "Apenas o proprietário ou um gestor pode ligar canais." }
      : {
          kind: "link",
          node: (className) => (
            <div className="space-y-2">
              {waConfigId && appId && metaReady ? (
                <WhatsAppEmbeddedSignup
                  appId={appId}
                  configId={waConfigId}
                  graphVersion={graphVersion()}
                  className={`${className} w-full`}
                  label={hasWhatsApp ? "Ligar outro número" : "Ligar conta"}
                />
              ) : (
                <Link href="/dashboard/settings/whatsapp" className={className}>
                  {hasWhatsApp ? "Gerir números" : "Ligar conta"}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
              {waConfigId && appId && metaReady && (
                <Link href="/dashboard/settings/whatsapp" className="block text-center text-xs text-white/40 hover:text-white/70">
                  {hasWhatsApp ? "Gerir números e token" : "Ligar manualmente com token"}
                </Link>
              )}
            </div>
          ),
        };

  return (
    <>
      <DashboardPageHeader
        title="Canais"
        subtitle="Ligue as contas onde os seus clientes lhe escrevem. As mensagens chegam todas à mesma Inbox."
      />

      <div className="space-y-6">
        <ResultBanner params={query} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ChannelCard
            platform="WHATSAPP"
            title="WhatsApp"
            description="Atenda e responda no número de WhatsApp Business da sua empresa, com a API oficial."
            connected={status.WHATSAPP}
            action={whatsappAction}
            canManage={canManage}
          />
          <ChannelCard
            platform="INSTAGRAM"
            title="Instagram"
            description="Receba e responda às mensagens directas da sua conta profissional de Instagram."
            connected={status.INSTAGRAM}
            action={oauthAction("instagram", status.INSTAGRAM.length > 0)}
            canManage={canManage}
          />
          <ChannelCard
            platform="MESSENGER"
            title="Messenger"
            description="Converse com os clientes que lhe escrevem na sua página do Facebook."
            connected={status.MESSENGER}
            action={oauthAction("messenger", status.MESSENGER.length > 0)}
            canManage={canManage}
          />
        </div>

        <p className="text-xs text-white/40">
          A ligação usa o Login do Facebook: escolhe as páginas e contas que quer partilhar, e pode retirar o acesso
          quando quiser nas definições do Facebook. Guardamos as credenciais cifradas.
        </p>
      </div>
    </>
  );
}
