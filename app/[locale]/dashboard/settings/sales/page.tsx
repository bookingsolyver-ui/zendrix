import { setRequestLocale } from "next-intl/server";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PaymentCatalog } from "@/components/dashboard/settings/sales/payment-catalog";
import { StripeDisconnectButton } from "@/components/dashboard/settings/sales/stripe-disconnect";
import { CARD } from "@/components/dashboard/settings/ui";
import { getCurrentUser } from "@/lib/auth/current-user";
import { evaluateAccess } from "@/lib/billing/policy";
import { publicOrigin } from "@/lib/http/public-url";
import { formatMoney } from "@/lib/payments/catalog";
import { prisma } from "@/lib/prisma";
import { connectConfigured } from "@/lib/stripe/connect";

const ERRORS: Record<string, string> = {
  not_configured: "O Stripe Connect ainda não está configurado nesta instalação. Contacte o suporte.",
  denied: "Cancelou a autorização no Stripe. Nada foi ligado.",
  invalid_state: "O pedido expirou. Volte a carregar em «Ligar Stripe».",
  session_expired: "A sessão expirou. Inicie sessão e tente de novo.",
  forbidden: "Apenas o proprietário ou um gestor pode ligar o Stripe.",
  subscription_required: "Ative o seu plano para ligar o Stripe.",
  conflict: "Esta conta Stripe já está ligada a outra organização.",
  stripe_error: "O Stripe recusou o pedido. Tente novamente.",
  server_error: "Algo correu mal do nosso lado. Tente novamente.",
};

const STATUS_STYLE: Record<string, string> = { PAID: "text-emerald-300", OPEN: "text-amber-200", EXPIRED: "text-white/40" };
const STATUS_LABEL: Record<string, string> = { PAID: "Pago", OPEN: "Por pagar", EXPIRED: "Expirou" };

export default async function SalesPage({
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
  const workspaceId = user?.workspace?.id;
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const planActive = user?.workspace
    ? evaluateAccess(user.workspace.subStatus, user.workspace.trialEndsAt ? new Date(user.workspace.trialEndsAt) : null).active
    : false;

  const [workspace, items, links] = workspaceId
    ? await Promise.all([
        prisma.workspace.findUnique({ where: { id: workspaceId }, select: { stripeConnectAccountId: true } }),
        prisma.paymentItem.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, take: 25 }),
        prisma.paymentLink.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, itemName: true, amountMinor: true, currency: true, status: true, createdAt: true } }),
      ])
    : [null, [], []];
  const accountId = workspace?.stripeConnectAccountId ?? null;
  const configured = connectConfigured();
  const origin = publicOrigin();

  return (
    <>
      <DashboardPageHeader title="Vendas e pagamentos" subtitle="Deixe a IA vender: envia o link de pagamento na própria conversa, direto para a sua conta Stripe." />
      <div className="space-y-6">
        {query.error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {ERRORS[query.error] ?? ERRORS.server_error}
          </div>
        )}
        {query.connected && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Stripe ligado. A IA já pode enviar links de pagamento dos itens do catálogo.
          </div>
        )}

        <div className={CARD}>
          <h2 className="text-sm font-semibold text-white">Conta Stripe</h2>
          <p className="mt-1 text-sm text-white/50">
            Os pagamentos dos seus clientes caem na <strong className="text-white/70">sua</strong> conta Stripe. A Zentrix nunca recebe esse dinheiro.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {accountId ? (
              <>
                <span className="flex items-center gap-2 text-sm text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Ligado · conta …{accountId.slice(-4)}
                </span>
                {canManage && <StripeDisconnectButton />}
              </>
            ) : !configured ? (
              <p className="text-sm text-white/50">Indisponível: o Stripe Connect ainda não está configurado nesta instalação.</p>
            ) : !canManage ? (
              <p className="text-sm text-white/50">Apenas o proprietário ou um gestor pode ligar o Stripe.</p>
            ) : !planActive ? (
              <p className="text-sm text-white/50">Ative o seu plano em Faturação para ligar o Stripe.</p>
            ) : (
              <a href={`/api/stripe/connect/start?locale=${locale}`} className="neon-btn rounded-full px-5 py-2.5 text-sm font-semibold text-background">
                Ligar Stripe
              </a>
            )}
          </div>
          {accountId && !origin && canManage && (
            <p role="alert" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
              A IA ainda não pode enviar links: falta definir NEXT_PUBLIC_APP_URL (o Stripe precisa de saber para onde devolver o cliente depois de pagar).
            </p>
          )}
        </div>

        <PaymentCatalog
          canManage={canManage}
          items={items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            amountInput: (item.amountMinor / 100).toFixed(2),
            amountLabel: formatMoney(item.amountMinor, item.currency),
            currency: item.currency,
            active: item.active,
          }))}
        />

        <div className={CARD}>
          <h2 className="text-sm font-semibold text-white">Links enviados</h2>
          {links.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Ainda não foi enviado nenhum link.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5 text-sm">
              {links.map((link) => (
                <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block font-medium text-white">{link.itemName}</span>
                    <span className="block text-white/50">{formatMoney(link.amountMinor, link.currency)} · {link.createdAt.toLocaleDateString("pt-PT")}</span>
                  </span>
                  <span className={`text-xs font-medium ${STATUS_STYLE[link.status] ?? ""}`}>{STATUS_LABEL[link.status] ?? link.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
