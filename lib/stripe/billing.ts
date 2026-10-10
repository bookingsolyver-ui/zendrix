import "server-only";
import { prisma } from "@/lib/prisma";
import { requireEnv, stripePost } from "@/lib/stripe/client";
import { trialEndFor } from "@/lib/stripe/encode";

// Faturação de uma organização: criar o Checkout (subscrição) e abrir o portal do cliente.
// Tudo parte do workspaceId da SESSÃO (nunca do corpo do pedido) e o Stripe devolve-o no webhook
// (client_reference_id + metadata.workspace_id), que é como lib/stripe/webhook.ts liga a compra à organização.

export class BillingError extends Error {
  constructor(readonly code: "workspace_not_found" | "already_subscribed" | "no_customer") {
    super(code);
    this.name = "BillingError";
  }
}

interface BillingWorkspace {
  id: string;
  name: string;
  subStatus: string;
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

async function loadWorkspace(workspaceId: string): Promise<BillingWorkspace> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      subStatus: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!workspace) throw new BillingError("workspace_not_found");
  return workspace;
}

// Um cliente do Stripe por organização. A chave de idempotência faz com que dois cliques simultâneos criem
// o MESMO cliente, e a gravação condicional garante que só um id fica ligado à organização.
async function ensureCustomer(workspace: BillingWorkspace, email: string): Promise<string> {
  if (workspace.stripeCustomerId) return workspace.stripeCustomerId;

  const customer = await stripePost<{ id: string }>(
    "/customers",
    {
      email,
      name: workspace.name,
      metadata: { workspace_id: workspace.id },
    },
    `kwanza-customer-${workspace.id}`,
  );

  const linked = await prisma.workspace.updateMany({
    where: { id: workspace.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (linked.count === 1) return customer.id;

  // Outro pedido ligou um cliente entretanto: usa-se esse.
  const current = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    select: { stripeCustomerId: true },
  });
  return current?.stripeCustomerId ?? customer.id;
}

export interface CheckoutInput {
  workspaceId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({ workspaceId, email, successUrl, cancelUrl }: CheckoutInput) {
  const priceId = requireEnv("STRIPE_PRICE_ID");
  const workspace = await loadWorkspace(workspaceId);

  // Já paga: um segundo Checkout criava uma segunda subscrição (e uma segunda cobrança). Gere-se no portal.
  if (workspace.subStatus === "active" && workspace.stripeSubscriptionId) {
    throw new BillingError("already_subscribed");
  }

  const customerId = await ensureCustomer(workspace, email);

  // Continuação do teste: o que resta dos 14 dias passa para o Stripe, que só cobra no fim.
  const trialEnd = trialEndFor(workspace.subStatus, workspace.trialEndsAt);

  const session = await stripePost<{ id: string; url: string | null }>("/checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    client_reference_id: workspace.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { workspace_id: workspace.id },
    subscription_data: {
      metadata: { workspace_id: workspace.id },
      trial_end: trialEnd,
    },
  });
  if (!session.url) throw new Error("O Stripe não devolveu o URL do Checkout");
  return { url: session.url, trialing: trialEnd !== undefined };
}

export async function createPortalSession(workspaceId: string, returnUrl: string) {
  const workspace = await loadWorkspace(workspaceId);
  if (!workspace.stripeCustomerId) throw new BillingError("no_customer");

  const session = await stripePost<{ url: string }>("/billing_portal/sessions", {
    customer: workspace.stripeCustomerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}
