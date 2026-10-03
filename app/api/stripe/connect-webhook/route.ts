import { after, NextResponse } from "next/server";
import { enqueueText } from "@/lib/outbox/enqueue";
import { drainOutbox } from "@/lib/outbox/process";
import { markPaymentLinkExpired, markPaymentLinkPaid } from "@/lib/payments/service";
import { verifyStripeSignature } from "@/lib/stripe/webhook";
import { stripeCheckoutSessionPaidSchema, stripeConnectEventSchema } from "@/lib/validations/stripe";

export const maxDuration = 30;

const THANKS = "Pagamento recebido: obrigado! ✅ A equipa dá seguimento ao seu pedido.";

// Webhook do Stripe CONNECT (eventos das contas ligadas: os pagamentos dos clientes das empresas). Distinto do
// webhook das subscrições da Zetrix. No Stripe: Developers → Webhooks → "Eventos em contas ligadas", com
// checkout.session.completed, checkout.session.async_payment_succeeded e checkout.session.expired.
// O segredo (whsec_...) vai em STRIPE_CONNECT_WEBHOOK_SECRET (vários, separados por vírgula, para o rodar).
export async function POST(request: Request) {
  const secrets = (process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (secrets.length === 0) {
    console.error("[stripe/connect-webhook] STRIPE_CONNECT_WEBHOOK_SECRET não está definido; a rejeitar o evento");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secrets)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const parsed = stripeConnectEventSchema.safeParse(json);
  // 2xx para o que não é nosso (outros tipos de eventos, eventos da própria plataforma): o Stripe só reenvia em não-2xx.
  if (!parsed.success) return NextResponse.json({ received: true, result: "ignored" });
  const event = parsed.data;

  try {
    const session = stripeCheckoutSessionPaidSchema.safeParse(event.data.object);
    if (!session.success) return NextResponse.json({ received: true, result: "ignored" });

    if (event.type === "checkout.session.expired") {
      await markPaymentLinkExpired({ sessionId: session.data.id, account: event.account });
      return NextResponse.json({ received: true, result: "expired" });
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      // `completed` também chega quando o pagamento ainda está pendente (métodos assíncronos): só conta se pago.
      if (session.data.payment_status !== "paid") return NextResponse.json({ received: true, result: "not_paid_yet" });
      const outcome = await markPaymentLinkPaid({ sessionId: session.data.id, account: event.account });
      if (outcome.result === "paid" && outcome.conversationId) {
        const { workspaceId, conversationId } = outcome;
        // O agradecimento vai depois da resposta ao Stripe e nunca o faz falhar (a janela de 24 h pode já ter fechado).
        after(async () => {
          const sent = await enqueueText({ workspaceId, conversationId, text: THANKS });
          if (sent.ok) await drainOutbox();
        });
      }
      return NextResponse.json({ received: true, result: outcome.result });
    }
    return NextResponse.json({ received: true, result: "ignored" });
  } catch (err) {
    // 500: o Stripe reenvia (a marcação como pago é idempotente).
    console.error("[stripe/connect-webhook] falhou", event.id, err instanceof Error ? err.name : "unknown");
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
