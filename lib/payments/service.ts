import "server-only";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { stripePost, StripeApiError, StripeNotConfiguredError } from "@/lib/stripe/client";
import { stageAfterPayment, stageAfterPaymentLink, type LeadStageName } from "@/lib/leads/lead";
import { formatMoney } from "@/lib/payments/catalog";

// Links de pagamento enviados pela IA, na conta Stripe DA EMPRESA (Connect).
//
// Defesas: a IA só escolhe um item do catálogo da organização (o preço vem SEMPRE da base de dados); o link
// só se cria se a empresa ligou o Stripe; há um limite de links por conversa; e "pago" só o confirma o
// webhook assinado do Stripe, nunca a IA nem o cliente.

export interface PaymentCapability {
  connected: boolean;
  items: { id: string; name: string; description: string | null; amountMinor: number; currency: string }[];
}

// O que a IA pode vender agora: itens ativos, e só se o Stripe está ligado.
export async function loadPaymentCapability(workspaceId: string): Promise<PaymentCapability> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { stripeConnectAccountId: true } });
  if (!workspace?.stripeConnectAccountId) return { connected: false, items: [] };
  const items = await prisma.paymentItem.findMany({
    where: { workspaceId, active: true },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: { id: true, name: true, description: true, amountMinor: true, currency: true },
  });
  return { connected: true, items };
}

export type CreateLinkResult =
  | { ok: true; url: string; itemName: string; amountLabel: string }
  | { ok: false; error: "not_connected" | "item_not_found" | "too_many_links" | "stripe_error" };

const LINK_TTL_SECONDS = 23 * 60 * 60; // o Checkout exige entre 30 min e 24 h
const MAX_LINKS_PER_HOUR = 3;

export async function createPaymentLink(input: {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  itemId: string;
  returnBase: string; // https://<dominio>/<lingua>/payment-return
}): Promise<CreateLinkResult> {
  const { workspaceId, conversationId, contactId, itemId, returnBase } = input;

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { stripeConnectAccountId: true } });
  if (!workspace?.stripeConnectAccountId) return { ok: false, error: "not_connected" };

  // O item TEM de ser desta organização e estar ativo: um id de outra organização é "não encontrado".
  const item = await prisma.paymentItem.findFirst({ where: { id: itemId, workspaceId, active: true } });
  if (!item) return { ok: false, error: "item_not_found" };

  const limited = await rateLimit(`payment-link:${conversationId}`, { limit: MAX_LINKS_PER_HOUR, windowMs: 60 * 60 * 1000, failClosed: true });
  if (!limited.ok) return { ok: false, error: "too_many_links" };

  try {
    const session = await stripePost<{ id: string; url: string | null }>(
      "/checkout/sessions",
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: item.currency.toLowerCase(),
              unit_amount: item.amountMinor,
              product_data: { name: item.name, ...(item.description ? { description: item.description } : {}) },
            },
          },
        ],
        success_url: `${returnBase}?status=success`,
        cancel_url: `${returnBase}?status=canceled`,
        expires_at: Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS,
        client_reference_id: contactId,
        metadata: { workspace_id: workspaceId, conversation_id: conversationId, contact_id: contactId, item_id: item.id },
        payment_intent_data: { metadata: { workspace_id: workspaceId, contact_id: contactId } },
      },
      undefined,
      { stripeAccount: workspace.stripeConnectAccountId },
    );
    if (!session.url) return { ok: false, error: "stripe_error" };

    await prisma.paymentLink.create({
      data: {
        workspaceId,
        conversationId,
        contactId,
        itemName: item.name,
        amountMinor: item.amountMinor,
        currency: item.currency,
        stripeSessionId: session.id,
        url: session.url,
      },
    });
    // O lead passa a "pagamento enviado" (nunca recua de WON).
    const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId }, select: { leadStage: true } });
    if (contact) {
      const stage = stageAfterPaymentLink(contact.leadStage as LeadStageName);
      if (stage !== contact.leadStage) await prisma.contact.update({ where: { id: contactId }, data: { leadStage: stage } });
    }
    return { ok: true, url: session.url, itemName: item.name, amountLabel: formatMoney(item.amountMinor, item.currency) };
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) console.error("[payments]", err.message);
    else if (err instanceof StripeApiError) console.error("[payments] o Stripe recusou:", err.status, err.code);
    else console.error("[payments] falhou", err instanceof Error ? err.name : "unknown");
    return { ok: false, error: "stripe_error" };
  }
}

// O webhook (assinado) diz que o Checkout foi pago. Confirma-se que o evento é DA conta Stripe desta empresa
// e só então se marca como pago e o lead como cliente. Idempotente: o Stripe repete eventos.
export async function markPaymentLinkPaid(input: { sessionId: string; account: string }): Promise<
  { result: "paid"; workspaceId: string; conversationId: string | null } | { result: "ignored"; reason: string }
> {
  const link = await prisma.paymentLink.findUnique({ where: { stripeSessionId: input.sessionId } });
  if (!link) return { result: "ignored", reason: "unknown_session" };

  const workspace = await prisma.workspace.findUnique({ where: { id: link.workspaceId }, select: { stripeConnectAccountId: true } });
  // Um evento de OUTRA conta Stripe nunca marca pagamentos desta empresa.
  if (!workspace?.stripeConnectAccountId || workspace.stripeConnectAccountId !== input.account) return { result: "ignored", reason: "account_mismatch" };

  const updated = await prisma.paymentLink.updateMany({ where: { id: link.id, status: { not: "PAID" } }, data: { status: "PAID", paidAt: new Date() } });
  if (updated.count === 0) return { result: "ignored", reason: "already_paid" };

  if (link.contactId) {
    await prisma.contact.updateMany({ where: { id: link.contactId, workspaceId: link.workspaceId }, data: { leadStage: stageAfterPayment(), qualifiedAt: new Date() } });
  }
  return { result: "paid", workspaceId: link.workspaceId, conversationId: link.conversationId };
}

export async function markPaymentLinkExpired(input: { sessionId: string; account: string }) {
  const link = await prisma.paymentLink.findUnique({ where: { stripeSessionId: input.sessionId }, select: { id: true, workspaceId: true } });
  if (!link) return;
  const workspace = await prisma.workspace.findUnique({ where: { id: link.workspaceId }, select: { stripeConnectAccountId: true } });
  if (workspace?.stripeConnectAccountId !== input.account) return;
  await prisma.paymentLink.updateMany({ where: { id: link.id, status: "OPEN" }, data: { status: "EXPIRED" } });
}
