import { test } from "node:test";
import assert from "node:assert/strict";
import { metaWebhookSchema, parseMessagingEntries, parseMetaPayload } from "./meta-whatsapp.ts";
import { stripeCheckoutSessionSchema, stripeEventSchema, stripeSubscriptionSchema, workspaceIdFromMetadata } from "./stripe.ts";
import { createApiKeySchema } from "./api-keys.ts";
import { sendTextSchema } from "./whatsapp-send.ts";

const metaPayload = (value: unknown) => ({ entry: [{ changes: [{ field: "messages", value }] }] });

test("Meta: mensagem de texto, nota de voz e estado válidos", () => {
  const [change] = parseMetaPayload(
    metaPayload({
      metadata: { phone_number_id: "123" },
      contacts: [{ wa_id: "351900", profile: { name: "Ana" } }],
      messages: [
        { id: "m1", from: "351900", type: "text", timestamp: "1700000000", text: { body: "olá" } },
        { id: "m2", from: "351900", type: "audio", timestamp: "1700000001", audio: { id: "a1", mime_type: "audio/ogg" } },
      ],
      statuses: [{ id: "m0", status: "delivered" }, { id: "m9", status: "failed", errors: [{ title: "boom" }] }],
    }),
  );
  assert.equal(change.phoneNumberId, "123");
  assert.equal(change.contactNames.get("351900"), "Ana");
  assert.equal(change.messages.length, 2);
  assert.equal(change.messages[0].text?.body, "olá");
  assert.equal(change.messages[0].timestamp, 1700000000);
  assert.equal(change.messages[1].audio?.id, "a1");
  assert.equal(change.statuses[1].errors[0].title, "boom");
});

test("Meta: elementos inválidos são ignorados sem estragar os válidos", () => {
  const [change] = parseMetaPayload(
    metaPayload({
      metadata: { phone_number_id: "123" },
      messages: [{ from: "x" }, 42, null, { id: "ok", from: "351900", type: "text", text: { body: "hi" } }],
      statuses: ["lixo", { id: "s1", status: "read" }],
    }),
  );
  assert.deepEqual(change.messages.map((m) => m.id), ["ok"]);
  assert.deepEqual(change.statuses.map((s) => s.id), ["s1"]);
});

test("Meta: formas inesperadas nunca lançam", () => {
  for (const bad of [null, undefined, 1, "x", [], {}, { entry: "x" }, { entry: [null, 1, {}] }, metaPayload({}), metaPayload({ metadata: {} })]) {
    assert.deepEqual(parseMetaPayload(bad), []);
  }
  // Outro campo que não "messages" (ex.: message_template_status_update) é ignorado.
  assert.deepEqual(parseMetaPayload({ entry: [{ changes: [{ field: "other", value: { metadata: { phone_number_id: "1" } } }] }] }), []);
});

test("Stripe: envelope e objetos", () => {
  assert.ok(stripeEventSchema.safeParse({ id: "evt_1", type: "x", created: 1, data: { object: {} } }).success);
  assert.ok(!stripeEventSchema.safeParse({ id: "evt_1", type: "x", created: "1", data: { object: {} } }).success);
  assert.ok(!stripeEventSchema.safeParse({ id: "evt_1", type: "x", created: 1 }).success);

  const sub = stripeSubscriptionSchema.parse({
    id: "sub_1",
    customer: { id: "cus_1" }, // com expand
    status: "trialing",
    trial_end: 1700000000,
    metadata: { workspace_id: "w1" },
    items: { data: [{ price: { lookup_key: "pro", nickname: null } }] },
  });
  assert.equal(sub.customer, "cus_1");
  assert.equal(workspaceIdFromMetadata(sub.metadata), "w1");
  assert.equal(workspaceIdFromMetadata({ workspace_id: 5 }), undefined);
  assert.ok(!stripeSubscriptionSchema.safeParse({ id: "sub_1" }).success); // sem cliente

  const session = stripeCheckoutSessionSchema.parse({ mode: "subscription", client_reference_id: "w1", customer: "cus_1", subscription: "sub_1" });
  assert.equal(session.subscription, "sub_1");
});

test("chaves de API: o OWNER nunca é permitido e campos extra são recusados", () => {
  assert.equal(createApiKeySchema.parse({ name: " CRM " }).role, "STAFF");
  assert.equal(createApiKeySchema.parse({ name: "CRM " }).name, "CRM");
  assert.ok(!createApiKeySchema.safeParse({ name: "x", role: "OWNER" }).success);
  assert.ok(!createApiKeySchema.safeParse({ name: "x", workspaceId: "outra" }).success);
  assert.ok(!createApiKeySchema.safeParse({ name: "" }).success);
  assert.ok(!createApiKeySchema.safeParse({ name: "x", expiresInDays: 0 }).success);
});

test("envio: texto aparado, obrigatório e limitado", () => {
  assert.equal(sendTextSchema.parse({ conversationId: "c1", text: "  olá " }).text, "olá");
  assert.ok(!sendTextSchema.safeParse({ conversationId: "c1", text: "   " }).success);
  assert.ok(!sendTextSchema.safeParse({ conversationId: "c1", text: "x".repeat(4097) }).success);
  assert.ok(!sendTextSchema.safeParse({ conversationId: 1, text: "x" }).success);
});

test("Meta unificado: o campo `object` escolhe a plataforma", () => {
  for (const object of ["whatsapp_business_account", "instagram", "page"]) {
    assert.equal(metaWebhookSchema.safeParse({ object, entry: [] }).success, true, object);
  }
  assert.equal(metaWebhookSchema.safeParse({ object: "user", entry: [] }).success, false);
  assert.equal(metaWebhookSchema.safeParse({ entry: [] }).success, false);
  assert.equal(metaWebhookSchema.safeParse({ object: "page", entry: "x" }).success, false);
});

test("Instagram/Messenger: mensagens, anexos, estados; ecos e lixo ignorados", () => {
  const [change] = parseMessagingEntries([
    {
      id: "PAGE1",
      messaging: [
        { sender: { id: "u1" }, recipient: { id: "PAGE1" }, timestamp: 1700000000000, message: { mid: "m1", text: "olá" } },
        { sender: { id: "u1" }, timestamp: 1700000001000, message: { mid: "m2", attachments: [{ type: "audio" }] } },
        { sender: { id: "PAGE1" }, timestamp: 1, message: { mid: "echo", text: "enviada por nós", is_echo: true } },
        { sender: { id: "u1" }, delivery: { mids: ["out1", "out2"] } },
        { sender: { id: "u1" }, read: { mid: "out1" } },
        { sender: { id: "u1" }, read: { watermark: 5 } },
        { sender: {}, message: { mid: "x" } },
        "lixo",
        null,
      ],
    },
    { messaging: [] },
    42,
  ]);
  assert.equal(change.accountId, "PAGE1");
  assert.deepEqual(change.messages.map((m) => [m.mid, m.text, m.attachmentType]), [["m1", "olá", null], ["m2", null, "audio"]]);
  assert.deepEqual(change.statuses, [
    { mid: "out1", status: "DELIVERED" },
    { mid: "out2", status: "DELIVERED" },
    { mid: "out1", status: "READ" },
  ]);
  assert.deepEqual(parseMessagingEntries([null, 1, {}]), []);
});
