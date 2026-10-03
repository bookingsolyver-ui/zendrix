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

// ---------------------------------------------------------------------------------------------------------
// Webhook unificado: a Meta envia WhatsApp, Instagram e Messenger para o MESMO endpoint. O campo `object`
// diz de que plataforma é o lote; cada plataforma tem o seu parser (WhatsApp: parseMetaPayload acima).

export const META_OBJECTS = ["whatsapp_business_account", "instagram", "page"] as const;

// União discriminada por `object`. O conteúdo de `entry` valida-se por elemento, em cada parser, para uma
// entrada estranha não deitar fora o resto do lote.
export const metaWebhookSchema = z.discriminatedUnion("object", [
  z.object({ object: z.literal("whatsapp_business_account"), entry: z.array(z.unknown()) }),
  z.object({ object: z.literal("instagram"), entry: z.array(z.unknown()) }),
  z.object({ object: z.literal("page"), entry: z.array(z.unknown()) }),
]);
export type MetaWebhook = z.infer<typeof metaWebhookSchema>;

// Instagram e Messenger partilham o formato entry[].messaging[]; entry.id é a conta/página dona do evento.
const messagingEntrySchema = z.object({
  id: z.string().min(1),
  messaging: z.array(z.unknown()).catch([]),
});

const messagingEventSchema = z.object({
  sender: z.object({ id: z.string().min(1) }),
  timestamp: z.number().catch(0), // milissegundos
  message: z
    .object({
      mid: z.string().min(1),
      text: z.string().optional().catch(undefined),
      is_echo: z.boolean().optional().catch(undefined),
      attachments: z.array(z.object({ type: z.string().catch("file") })).optional().catch(undefined),
    })
    .optional()
    .catch(undefined),
  delivery: z.object({ mids: z.array(z.string()).optional().catch(undefined) }).optional().catch(undefined),
  read: z.object({ mid: z.string().optional().catch(undefined) }).optional().catch(undefined),
});

export interface MessagingMessage {
  senderId: string;
  mid: string;
  text: string | null;
  attachmentType: string | null; // image | video | audio | file | ...
  timestampMs: number; // 0 = desconhecido
}

export interface MessagingStatus {
  mid: string;
  status: "DELIVERED" | "READ";
}

export interface MessagingChange {
  accountId: string;
  messages: MessagingMessage[];
  statuses: MessagingStatus[];
}

// Instagram e Messenger. Nunca lança; o que não é válido fica de fora. Ecos (mensagens enviadas pela própria
// página/conta, incluindo as da app da Meta) não são mensagens de clientes: ignoram-se.
export function parseMessagingEntries(entries: unknown[]): MessagingChange[] {
  const changes: MessagingChange[] = [];
  for (const rawEntry of entries) {
    const entry = messagingEntrySchema.safeParse(rawEntry);
    if (!entry.success) continue;

    const change: MessagingChange = { accountId: entry.data.id, messages: [], statuses: [] };
    for (const rawEvent of entry.data.messaging) {
      const event = messagingEventSchema.safeParse(rawEvent);
      if (!event.success) continue;
      const { sender, timestamp, message, delivery, read } = event.data;

      if (message && !message.is_echo) {
        change.messages.push({
          senderId: sender.id,
          mid: message.mid,
          text: message.text ?? null,
          attachmentType: message.attachments?.[0]?.type ?? null,
          timestampMs: timestamp,
        });
      }
      for (const mid of delivery?.mids ?? []) change.statuses.push({ mid, status: "DELIVERED" });
      // O Messenger só diz "lido até esta hora" (watermark), sem ids: não dá para saber que mensagens. O
      // Instagram diz qual (read.mid): esse aplica-se.
      if (read?.mid) change.statuses.push({ mid: read.mid, status: "READ" });
    }
    if (change.messages.length || change.statuses.length) changes.push(change);
  }
  return changes;
}
