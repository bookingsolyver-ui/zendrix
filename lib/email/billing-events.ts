import "server-only";
import { notifyOrUpgrade, ownerRecipients, queueNotification } from "@/lib/email/notify";
import { formatMoney } from "@/lib/email/money";
import { appBaseUrl } from "@/lib/http/public-url";
import { prisma } from "@/lib/prisma";
import type { StripeInvoice } from "@/lib/validations/stripe";

// «Subscrição renovada com sucesso». Há duas fontes, que se juntam num só e-mail por renovação (a chave é o novo fim
// do período, igual nas duas):
//   1. invoice.payment_succeeded (o pagamento processado): traz o valor e o recibo. É a fonte principal.
//   2. customer.subscription.updated com o período a avançar: serve de rede de segurança se o endpoint do webhook não
//      estiver subscrito às faturas. Fica à espera 10 minutos; se o recibo chegar entretanto, o e-mail sai com ele.
// Nenhuma das duas lança erros nem bloqueia o webhook.

const FALLBACK_DELAY_MS = 10 * 60_000;
const billingUrl = (locale: string | null) => `${appBaseUrl()}/${locale === "en" || locale === "es" ? locale : "pt"}/dashboard/settings/billing`;
const langOf = (locale: string | null) => (locale === "en" || locale === "es" ? locale : "pt");

// Rede de segurança: o período pago avançou, sem fatura ainda.
export async function notifyRenewal(workspaceId: string, periodEnd: Date, plan: string | null): Promise<void> {
  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    if (!workspace) return;
    const priceLabel = process.env.NEXT_PUBLIC_PLAN_PRICE_LABEL?.trim() || null;
    for (const recipient of await ownerRecipients(workspaceId)) {
      await queueNotification({
        kind: "subscription_renewed",
        dedupeKey: `renewal:${periodEnd.toISOString()}`,
        to: recipient.email,
        locale: recipient.locale,
        workspaceId,
        notBefore: new Date(Date.now() + FALLBACK_DELAY_MS),
        payload: { name: recipient.name, orgName: workspace.name, plan, renewedUntil: periodEnd.toISOString(), priceLabel, billingUrl: billingUrl(recipient.locale) },
      });
    }
  } catch (err) {
    console.error("[email] renovação: falhou", workspaceId, err);
  }
}

// O pagamento processado: só renovações (billing_reason = subscription_cycle), não a primeira cobrança.
export async function notifyInvoicePaid(invoice: StripeInvoice): Promise<void> {
  try {
    if (invoice.billing_reason !== "subscription_cycle" || !invoice.customer) return;
    const workspace = await prisma.workspace.findUnique({ where: { stripeCustomerId: invoice.customer }, select: { id: true, name: true, plan: true } });
    if (!workspace) return;
    const endSeconds = invoice.lines?.data[0]?.period?.end ?? invoice.period_end;
    if (typeof endSeconds !== "number") return;
    const periodEnd = new Date(endSeconds * 1000);
    const priceLabel = process.env.NEXT_PUBLIC_PLAN_PRICE_LABEL?.trim() || null;

    for (const recipient of await ownerRecipients(workspace.id)) {
      const amountLabel = typeof invoice.amount_paid === "number" && invoice.currency ? formatMoney(invoice.amount_paid, invoice.currency, langOf(recipient.locale)) : null;
      await notifyOrUpgrade({
        kind: "subscription_renewed",
        dedupeKey: `renewal:${periodEnd.toISOString()}`,
        to: recipient.email,
        locale: recipient.locale,
        workspaceId: workspace.id,
        payload: { name: recipient.name, orgName: workspace.name, plan: workspace.plan, renewedUntil: periodEnd.toISOString(), priceLabel, amountLabel, receiptUrl: invoice.hosted_invoice_url ?? null, billingUrl: billingUrl(recipient.locale) },
      });
    }
  } catch (err) {
    console.error("[email] fatura paga: falhou", invoice.id, err);
  }
}
