import "server-only";
import { z } from "zod";

// Formas do que o Stripe envia nos webhooks. O corpo vem de fora (mesmo assinado, o que NÓS lemos dele tem de
// ser validado): cada campo usado tem tipo verificado, e o que não encaixa é ignorado em vez de partir.

// "customer"/"subscription" vêm como id ("cus_…") ou, com expand, como objeto com `id`.
const idOrObject = z
  .union([z.string().min(1), z.object({ id: z.string().min(1) })])
  .transform((value) => (typeof value === "string" ? value : value.id));

// Só o dono da conta Stripe escreve metadata; os valores lidos têm de ser strings.
const metadata = z.record(z.string(), z.unknown()).nullish();

// O envelope comum a todos os eventos.
export const stripeEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().int().positive(), // segundos
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});
export type StripeEvent = z.infer<typeof stripeEventSchema>;

export const stripeSubscriptionSchema = z.object({
  id: z.string().min(1),
  customer: idOrObject,
  status: z.string().optional(),
  metadata,
  trial_end: z.number().nullish(), // segundos
  current_period_end: z.number().nullish(), // segundos (versões antigas da API)
  cancel_at_period_end: z.boolean().nullish(),
  items: z
    .object({
      data: z.array(
        z.object({
          price: z.object({ lookup_key: z.string().nullish(), nickname: z.string().nullish() }).nullish(),
          current_period_end: z.number().nullish(), // segundos (versões recentes da API)
        }),
      ),
    })
    .nullish(),
});

export const stripeCheckoutSessionSchema = z.object({
  mode: z.string(),
  client_reference_id: z.string().nullish(),
  customer: idOrObject.nullish(),
  subscription: idOrObject.nullish(),
  metadata,
});

// metadata.workspace_id como string não vazia, ou undefined.
export function workspaceIdFromMetadata(meta: Record<string, unknown> | null | undefined) {
  const value = meta?.workspace_id;
  return typeof value === "string" && value ? value : undefined;
}

// ---------------------------------------------------------------------------------------------- Connect
// Eventos das contas LIGADAS (pagamentos dos clientes das empresas). Chegam a um endpoint próprio e trazem o
// id da conta de onde vieram (`account`): só valem para a organização que ligou ESSA conta.
export const stripeConnectEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().int().positive(),
  account: z.string().regex(/^acct_[A-Za-z0-9]+$/),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

export const stripeCheckoutSessionPaidSchema = z.object({
  id: z.string().min(1),
  mode: z.string().optional(),
  payment_status: z.string().optional(),
});

// A fatura paga (invoice.payment_succeeded / invoice.paid). Só se leem os campos usados no e-mail de renovação.
export const stripeInvoiceSchema = z.object({
  id: z.string().min(1),
  customer: idOrObject.nullish(),
  billing_reason: z.string().nullish(), // "subscription_cycle" = renovação; "subscription_create" = primeira cobrança
  amount_paid: z.number().int().nonnegative().nullish(), // na unidade mínima (cêntimos)
  currency: z.string().length(3).nullish(),
  hosted_invoice_url: z.string().url().nullish(),
  period_end: z.number().nullish(),
  lines: z.object({ data: z.array(z.object({ period: z.object({ end: z.number() }).nullish() })) }).nullish(),
});
export type StripeInvoice = z.infer<typeof stripeInvoiceSchema>;
