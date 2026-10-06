import "server-only";
import { NextResponse } from "next/server";
import { PaymentSyncService, paymentEventSchema } from "@/lib/integrations/payment-sync";
import { SignedWebhookController } from "@/lib/integrations/signed-webhook";

// BankSyncController: recebe de um agregador bancário (ou de um intermediário que leia o extrato) a notícia «entrou
// um pagamento com a referência X». PLACEHOLDER pronto a ligar: o formato abaixo é o do Zetrix; para um banco concreto
// (BAI, BFA, Multicaixa, Open Banking...) basta um pequeno adaptador que traduza o payload do banco para este.
//
// Segredo: BANK_SYNC_WEBHOOK_SECRET. Endpoint: POST /api/integrations/bank-sync (app/api/integrations/bank-sync/route.ts).
// Corpo: { eventId, workspaceId, reference (id do link de pagamento), amountMinor, currency }.
export class BankSyncController extends SignedWebhookController {
  protected readonly label = "integrations/bank-sync";
  protected readonly secretEnv = "BANK_SYNC_WEBHOOK_SECRET";

  protected async handleVerified(payload: unknown) {
    const parsed = paymentEventSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    const { outcome, detail, duplicate } = await PaymentSyncService.apply("bank", parsed.data);
    return NextResponse.json({ success: true, outcome, detail, duplicate });
  }
}
