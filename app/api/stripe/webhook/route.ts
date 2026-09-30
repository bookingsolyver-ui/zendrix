import { NextResponse } from "next/server";
import { applyStripeEvent, verifyStripeSignature, type StripeEvent } from "@/lib/stripe/webhook";

export const maxDuration = 30;

// Endpoint do webhook do Stripe. Configurar no painel do Stripe (Developers → Webhooks) com os eventos:
//   customer.subscription.created · customer.subscription.updated · customer.subscription.deleted ·
//   checkout.session.completed
// O segredo (whsec_…) vai em STRIPE_WEBHOOK_SECRET; vários, separados por vírgula, para rodar sem falhas.
export async function POST(request: Request) {
  const secrets = (process.env.STRIPE_WEBHOOK_SECRET ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (secrets.length === 0) {
    // Sem segredo não se consegue verificar quem chama: não se aceita nada.
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET não está definido; a rejeitar o evento");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  // A assinatura cobre os bytes exatos que o Stripe enviou: ler o corpo bruto antes de o interpretar.
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secrets)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed?.id !== "string" || typeof parsed?.type !== "string" || typeof parsed?.created !== "number") {
      throw new Error("shape");
    }
    event = parsed;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const outcome = await applyStripeEvent(event);
    if (outcome.result === "applied") {
      console.info(`[stripe/webhook] ${event.type}: organização ${outcome.workspaceId} → ${outcome.status}`);
    } else if (outcome.result === "unknown_org") {
      console.warn(`[stripe/webhook] ${event.type} (${event.id}): nenhuma organização ligada a este cliente; ignorado`);
    }
    // 2xx também para eventos ignorados/antigos: o Stripe só reenvia quando a resposta não é 2xx.
    return NextResponse.json({ received: true, result: outcome.result });
  } catch (err) {
    // 500: o Stripe reenvia mais tarde (a aplicação do evento é idempotente e protegida contra ordem).
    console.error("[stripe/webhook] falhou ao aplicar o evento", event.id, err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
