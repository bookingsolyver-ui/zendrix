import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/alerts/notification-service";
import { stageAfterPayment } from "@/lib/leads/lead";

// PaymentSyncService: aplica um pagamento confirmado por um sistema externo (banco, faturação AGT) a um negócio do
// Zetrix. «Negócio pago» = PaymentLink PAID + contacto como cliente (WON), exatamente o que o webhook do Stripe faz
// (lib/payments/service.ts), mas por referência. Este módulo NÃO altera esse código: reutiliza só a regra de fase.
//
// Segurança: o evento já vem com a assinatura HMAC verificada (lib/integrations/signed-webhook.ts). Aqui ainda se exige
// que a referência pertença à organização indicada e que o valor e a moeda batam certo com o negócio: um evento
// assinado com o valor errado é REJEITADO e avisa o dono em vez de marcar como pago.

export const paymentEventSchema = z.object({
  eventId: z.string().trim().min(1).max(120), // id do evento no fornecedor: a idempotência
  workspaceId: z.string().trim().min(1).max(40),
  reference: z.string().trim().min(1).max(60), // o id do link de pagamento (PaymentLink.id) que o cliente pagou
  amountMinor: z.number().int().positive().max(1_000_000_000), // cêntimos
  currency: z.string().trim().length(3).transform((c) => c.toUpperCase()),
});
export type PaymentEvent = z.infer<typeof paymentEventSchema>;

export type Provider = "bank" | "agt";
export type PaymentOutcome = { outcome: "applied" | "ignored" | "rejected"; detail: string };

export const PaymentSyncService = {
  async apply(provider: Provider, event: PaymentEvent): Promise<PaymentOutcome & { duplicate: boolean }> {
    // Já tratado? (o fornecedor repete webhooks)
    const previous = await prisma.integrationEvent.findUnique({ where: { provider_externalId: { provider, externalId: event.eventId } }, select: { outcome: true, detail: true } });
    if (previous) return { outcome: previous.outcome as PaymentOutcome["outcome"], detail: previous.detail ?? "duplicate", duplicate: true };

    const result = await this.match(event);
    // Regista DEPOIS de aplicar: aplicar é idempotente (só passa a PAID uma vez); se o registo falhar, a repetição do
    // fornecedor volta a tentar sem duplicar nada. A chave única apanha duas entregas simultâneas.
    await prisma.integrationEvent
      .create({ data: { provider, externalId: event.eventId, workspaceId: event.workspaceId, outcome: result.outcome, detail: result.detail } })
      .catch((err: { code?: string }) => {
        if (err.code !== "P2002") throw err;
      });
    return { ...result, duplicate: false };
  },

  async match(event: PaymentEvent): Promise<PaymentOutcome> {
    const link = await prisma.paymentLink.findFirst({ where: { id: event.reference, workspaceId: event.workspaceId } });
    if (!link) return this.matchReceivable(event); // não é um link de pagamento: pode ser uma cobrança (Cash-Collector)
    if (link.status === "PAID") return { outcome: "ignored", detail: "already_paid" };

    if (link.amountMinor !== event.amountMinor || link.currency.toUpperCase() !== event.currency) {
      await NotificationService.notify({
        workspaceId: link.workspaceId,
        kind: "payment_received",
        severity: "critical",
        title: "Pagamento com valor diferente",
        body: `Chegou um pagamento de ${(event.amountMinor / 100).toFixed(2)} ${event.currency} para «${link.itemName}» (esperado ${(link.amountMinor / 100).toFixed(2)} ${link.currency}). Não foi marcado como pago: confirme à mão.`,
        contactId: link.contactId,
        dedupeKey: `payment-mismatch:${link.id}:${event.eventId}`,
      });
      return { outcome: "rejected", detail: "amount_mismatch" };
    }

    const updated = await prisma.paymentLink.updateMany({ where: { id: link.id, status: { not: "PAID" } }, data: { status: "PAID", paidAt: new Date() } });
    if (updated.count === 0) return { outcome: "ignored", detail: "already_paid" };
    if (link.contactId) {
      await prisma.contact.updateMany({ where: { id: link.contactId, workspaceId: link.workspaceId }, data: { leadStage: stageAfterPayment(), qualifiedAt: new Date() } });
    }
    await NotificationService.notify({
      workspaceId: link.workspaceId,
      kind: "payment_received",
      severity: "info",
      title: "Pagamento recebido",
      body: `«${link.itemName}» (${(link.amountMinor / 100).toFixed(2)} ${link.currency}) foi pago. O negócio passou a Pago.`,
      contactId: link.contactId,
      dedupeKey: `payment:${link.id}`,
    });
    return { outcome: "applied", detail: "paid" };
  },

  // Cobranças do Cash-Collector: a referência é o id da cobrança ou o número da fatura. Mesmas regras de valor e moeda.
  async matchReceivable(event: PaymentEvent): Promise<PaymentOutcome> {
    const receivable = await prisma.receivable.findFirst({ where: { workspaceId: event.workspaceId, OR: [{ id: event.reference }, { reference: event.reference }] } });
    if (!receivable) return { outcome: "ignored", detail: "unknown_reference" };
    if (receivable.status !== "PENDING") return { outcome: "ignored", detail: `already_${receivable.status.toLowerCase()}` };
    if (receivable.amountMinor !== event.amountMinor || receivable.currency.toUpperCase() !== event.currency) return { outcome: "rejected", detail: "amount_mismatch" };
    const updated = await prisma.receivable.updateMany({ where: { id: receivable.id, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
    return updated.count ? { outcome: "applied", detail: "receivable_paid" } : { outcome: "ignored", detail: "already_paid" };
  },
};
