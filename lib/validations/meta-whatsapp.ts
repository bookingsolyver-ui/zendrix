import "server-only";
import { z } from "zod";

// Formas do webhook da WhatsApp Cloud API (Meta): entry[].changes[].value.{messages,statuses,contacts}.
// A validação é por elemento: uma mensagem estranha é ignorada, as restantes do mesmo pedido passam
// (a Meta agrupa vários eventos num POST, e um 4xx/5xx faria a Meta reenviar o lote todo).

export const metaPayloadSchema = z.object({ entry: z.array(z.unknown()) });

const entrySchema = z.object({ changes: z.array(z.unknown()).catch([]) });
const changeSchema = z.object({ field: z.string(), value: z.record(z.string(), z.unknown()) });

const valueSchema = z.object({
  metadata: z.object({ phone_number_id: z.string().min(1) }),
  contacts: z.array(z.unknown()).catch([]),
  messages: z.array(z.unknown()).catch([]),
  statuses: z.array(z.unknown()).catch([]),
});

const contactSchema = z.object({
  wa_id: z.string().min(1),
  profile: z.object({ name: z.string() }),
});

export const metaMessageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  type: z.string().catch("unknown"),
  timestamp: z.coerce.number().catch(0), // segundos; 0 = desconhecido
  text: z.object({ body: z.string() }).optional().catch(undefined),
  audio: z
    .object({ id: z.string().min(1), mime_type: z.string().optional().catch(undefined) })
    .optional()
    .catch(undefined),
});
export type MetaMessage = z.infer<typeof metaMessageSchema>;

export const metaStatusSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  errors: z
    .array(z.object({ title: z.string().optional(), message: z.string().optional() }))
    .catch([]),
});
export type MetaStatus = z.infer<typeof metaStatusSchema>;

export interface MetaChange {
  phoneNumberId: string;
  contactNames: Map<string, string>;
  messages: MetaMessage[];
  statuses: MetaStatus[];
}

// Achata e valida o payload. Nunca lança: o que não é válido é deixado de fora.
export function parseMetaPayload(payload: unknown): MetaChange[] {
  const root = metaPayloadSchema.safeParse(payload);
  if (!root.success) return [];

  const changes: MetaChange[] = [];
  for (const rawEntry of root.data.entry) {
    const entry = entrySchema.safeParse(rawEntry);
    if (!entry.success) continue;
    for (const rawChange of entry.data.changes) {
      const change = changeSchema.safeParse(rawChange);
      if (!change.success || change.data.field !== "messages") continue;
      const value = valueSchema.safeParse(change.data.value);
      if (!value.success) continue;

      const contactNames = new Map<string, string>();
      for (const raw of value.data.contacts) {
        const contact = contactSchema.safeParse(raw);
        if (contact.success) contactNames.set(contact.data.wa_id, contact.data.profile.name);
      }
      changes.push({
        phoneNumberId: value.data.metadata.phone_number_id,
        contactNames,
        messages: value.data.messages.flatMap((raw) => {
          const parsed = metaMessageSchema.safeParse(raw);
          return parsed.success ? [parsed.data] : [];
        }),
        statuses: value.data.statuses.flatMap((raw) => {
          const parsed = metaStatusSchema.safeParse(raw);
          return parsed.success ? [parsed.data] : [];
        }),
      });
    }
  }
  return changes;
}
