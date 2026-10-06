import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentSyncService } from "@/lib/integrations/payment-sync";
import { SignedWebhookController } from "@/lib/integrations/signed-webhook";

// AGTInvoiceService: base para a faturação certificada (AGT). PLACEHOLDER: a emissão real de faturas exige o
// certificado de software e as credenciais da AGT, que não existem ainda; fica a interface (InvoiceProvider) e um
// serviço que recebe o webhook «fatura paga» e emite NADA até haver fornecedor ligado.

export interface InvoiceRequest {
  workspaceId: string;
  paymentLinkId: string;
  customerName: string;
  customerTaxId?: string;
  amountMinor: number;
  currency: string;
}
export type InvoiceResult = { status: "issued"; invoiceNumber: string } | { status: "not_configured" };

// O contrato que um fornecedor real (ou a API da AGT) tem de cumprir.
export interface InvoiceProvider {
  issueInvoice(request: InvoiceRequest): Promise<InvoiceResult>;
}

export class AGTInvoiceService extends SignedWebhookController implements InvoiceProvider {
  protected readonly label = "integrations/agt";
  protected readonly secretEnv = "AGT_WEBHOOK_SECRET";

  // TODO(AGT): ligar à API de emissão. Até lá devolve not_configured (nunca finge ter emitido uma fatura).
  async issueInvoice(): Promise<InvoiceResult> {
    return { status: "not_configured" };
  }

  // Webhook «fatura liquidada»: Corpo { eventId, workspaceId, invoiceNumber, paymentReference, amountMinor, currency, status }.
  protected async handleVerified(payload: unknown) {
    const parsed = z
      .object({
        eventId: z.string().trim().min(1).max(120),
        workspaceId: z.string().trim().min(1).max(40),
        invoiceNumber: z.string().trim().min(1).max(60),
        paymentReference: z.string().trim().min(1).max(60),
        amountMinor: z.number().int().positive().max(1_000_000_000),
        currency: z.string().trim().length(3),
        status: z.string().trim().toLowerCase(),
      })
      .safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    // Só «paga» muda o negócio; outros estados (emitida, anulada) ficam registados mas sem efeito.
    if (parsed.data.status !== "paid") return NextResponse.json({ success: true, outcome: "ignored", detail: `status_${parsed.data.status}` });

    const event = { eventId: parsed.data.eventId, workspaceId: parsed.data.workspaceId, reference: parsed.data.paymentReference, amountMinor: parsed.data.amountMinor, currency: parsed.data.currency.toUpperCase() };
    const { outcome, detail, duplicate } = await PaymentSyncService.apply("agt", event);
    return NextResponse.json({ success: true, outcome, detail, duplicate });
  }
}
