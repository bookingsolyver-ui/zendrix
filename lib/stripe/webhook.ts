import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { isRenewal } from "@/lib/email/notifications";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  stripeCheckoutSessionSchema,
  stripeSubscriptionSchema,
  workspaceIdFromMetadata,
  type StripeEvent,
} from "@/lib/validations/stripe";

export type { StripeEvent };

// Webhook do Stripe: mantém Workspace.subStatus em linha com a subscrição, e com isso liga e desliga o agente
// e o processamento de áudio (ambos leem o estado da organização a cada mensagem: lib/tenant.ts).

// ---------------------------------------------------------------- assinatura
// Stripe-Signature: "t=<segundos>,v1=<hmac>[,v1=<hmac>][,v0=...]". O hmac é HMAC-SHA256, em hexadecimal, de
// "<t>.<corpo bruto>" com o segredo do endpoint (whsec_…). Sem esta verificação, qualquer pessoa podia
// "cancelar" ou "ativar" a subscrição de uma organização com um POST.
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secrets: string[],
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!header || secrets.length === 0) return false;

  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "t") timestamp = Number(value);
    else if (key?.trim() === "v1" && value) signatures.push(value.trim());
  }
  if (!Number.isFinite(timestamp) || timestamp <= 0 || signatures.length === 0)
    return false;
  // Um pedido antigo (ou do futuro) pode ser um reenvio de um atacante que guardou um pedido válido.
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS)
    return false;

  // Vários segredos: permite rodar o segredo sem deixar de aceitar eventos durante a troca.
  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`, "utf8")
      .digest();
    return signatures.some((signature) => {
      const received = Buffer.from(signature, "hex");
      return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
      );
    });
  });
}

// ---------------------------------------------------------------- estados
export type SubStatus = "trialing" | "active" | "past_due" | "canceled";

// Estado do Stripe -> o nosso. null = não mexer: ainda não há pagamento (incomplete) ou o evento não diz nada
// que devamos aplicar. "unpaid" e "paused" bloqueiam como o past_due: sem pagamento em dia, o agente pára.
export function mapStripeStatus(status: string): SubStatus | null {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return null; // incomplete, incomplete_expired, desconhecido
  }
}

// ---------------------------------------------------------------- eventos
export type ApplyResult =
  | { result: "applied"; workspaceId: string; status: SubStatus; renewal?: { periodEnd: Date; plan: string | null } }
  | { result: "linked"; workspaceId: string }
  | { result: "ignored"; reason: string }
  | { result: "stale" }
  | { result: "unknown_org" };

const ORG_SELECT = {
  id: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  periodEnd: true,
  plan: true,
} as const;

// A organização de um evento: pelo cliente do Stripe já ligado, ou, na primeira vez, pelo metadata que NÓS
// pusemos ao criar o checkout/subscrição (o metadata só o dono da conta Stripe consegue escrever).
// Nunca por e-mail: quem paga com o e-mail de outra pessoa não pode mexer na subscrição dela.
async function findOrganization(
  customerId: string | null,
  metadataWorkspaceId: string | undefined,
) {
  if (customerId) {
    const byCustomer = await prisma.workspace.findUnique({
      where: { stripeCustomerId: customerId },
      select: ORG_SELECT,
    });
    if (byCustomer) return byCustomer;
  }
  if (metadataWorkspaceId) {
    return prisma.workspace.findUnique({
      where: { id: metadataWorkspaceId },
      select: ORG_SELECT,
    });
  }
  return null;
}

async function applySubscription(event: StripeEvent): Promise<ApplyResult> {
  const parsed = stripeSubscriptionSchema.safeParse(event.data.object);
  if (!parsed.success)
    return { result: "ignored", reason: "subscrição sem id ou cliente" };
  const sub = parsed.data;
  const subscriptionId = sub.id;
  const customerId = sub.customer;

  const nextStatus: SubStatus | null =
    event.type === "customer.subscription.deleted"
      ? "canceled"
      : mapStripeStatus(sub.status ?? "");
  if (!nextStatus)
    return {
      result: "ignored",
      reason: `estado "${sub.status ?? ""}" não altera nada`,
    };

  const org = await findOrganization(
    customerId,
    workspaceIdFromMetadata(sub.metadata),
  );
  if (!org) return { result: "unknown_org" };

  // Só a subscrição ATUAL governa o estado. O fim de uma subscrição antiga (o cliente já assinou outra)
  // não pode cancelar a nova.
  if (
    org.stripeSubscriptionId &&
    org.stripeSubscriptionId !== subscriptionId &&
    nextStatus === "canceled"
  ) {
    return { result: "ignored", reason: "fim de uma subscrição antiga" };
  }

  const price = sub.items?.data[0]?.price;
  const plan = [price?.lookup_key, price?.nickname].find(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  const trialEnd =
    typeof sub.trial_end === "number" ? new Date(sub.trial_end * 1000) : null;
  const eventAt = new Date(event.created * 1000);
  // O fim do período pago: a API antiga põe-no na subscrição, a recente nos itens.
  const periodEndSeconds = sub.current_period_end ?? sub.items?.data[0]?.current_period_end;
  const periodEnd = typeof periodEndSeconds === "number" ? new Date(periodEndSeconds * 1000) : null;

  try {
    // Atómico: só aplica se este evento for tão recente como o último aplicado. O Stripe não garante a ordem.
    const updated = await prisma.workspace.updateMany({
      where: {
        id: org.id,
        OR: [{ stripeEventAt: null }, { stripeEventAt: { lte: eventAt } }],
      },
      data: {
        subStatus: nextStatus,
        stripeSubscriptionId: subscriptionId,
        stripeEventAt: eventAt,
        ...(org.stripeCustomerId ? {} : { stripeCustomerId: customerId }),
        ...(plan ? { plan } : {}),
        ...(periodEnd ? { periodEnd } : {}),
        cancelAtPeriodEnd: nextStatus === "canceled" ? false : Boolean(sub.cancel_at_period_end),
        ...(nextStatus === "trialing" && trialEnd
          ? { trialEndsAt: trialEnd }
          : {}),
      },
    });
    if (updated.count !== 1) return { result: "stale" };
    // Renovação: a subscrição está ativa e o período pago avançou (não é a primeira ativação nem uma repetição).
    const renewal = nextStatus === "active" && periodEnd && isRenewal(org.periodEnd, periodEnd) ? { periodEnd, plan: plan ?? org.plan } : undefined;
    return { result: "applied", workspaceId: org.id, status: nextStatus, ...(renewal ? { renewal } : {}) };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        result: "ignored",
        reason: "cliente ou subscrição já pertence a outra organização",
      };
    }
    throw err;
  }
}

// checkout.session.completed: é aqui que uma organização fica ligada ao seu cliente do Stripe, através do
// client_reference_id (ou metadata.workspace_id) que pusemos ao criar o checkout.
async function applyCheckoutCompleted(
  event: StripeEvent,
): Promise<ApplyResult> {
  const parsed = stripeCheckoutSessionSchema.safeParse(event.data.object);
  if (!parsed.success)
    return { result: "ignored", reason: "checkout sem organização ou cliente" };
  const session = parsed.data;
  if (session.mode !== "subscription")
    return { result: "ignored", reason: "checkout que não é de subscrição" };

  const workspaceId = [
    session.client_reference_id,
    workspaceIdFromMetadata(session.metadata),
  ].find((v): v is string => typeof v === "string" && v.length > 0);
  const customerId = session.customer;
  if (!workspaceId || !customerId)
    return { result: "ignored", reason: "checkout sem organização ou cliente" };

  const org = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: ORG_SELECT,
  });
  if (!org) return { result: "unknown_org" };
  if (org.stripeCustomerId && org.stripeCustomerId !== customerId) {
    return {
      result: "ignored",
      reason: "a organização já está ligada a outro cliente do Stripe",
    };
  }

  const subscriptionId = session.subscription ?? null;
  try {
    await prisma.workspace.updateMany({
      where: {
        id: org.id,
        OR: [{ stripeCustomerId: null }, { stripeCustomerId: customerId }],
      },
      data: {
        stripeCustomerId: customerId,
        ...(subscriptionId && !org.stripeSubscriptionId
          ? { stripeSubscriptionId: subscriptionId }
          : {}),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        result: "ignored",
        reason: "cliente ou subscrição já pertence a outra organização",
      };
    }
    throw err;
  }
  return { result: "linked", workspaceId: org.id };
}

export async function applyStripeEvent(
  event: StripeEvent,
): Promise<ApplyResult> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return applySubscription(event);
    case "checkout.session.completed":
      return applyCheckoutCompleted(event);
    default:
      return { result: "ignored", reason: `evento ${event.type} não usado` };
  }
}
