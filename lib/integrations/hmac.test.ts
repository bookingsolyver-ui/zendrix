import assert from "node:assert/strict";
import test from "node:test";
import { signPayload, verifyWebhookSignature } from "./hmac.ts";

const secret = "segredo-de-teste";
const body = JSON.stringify({ eventId: "e1", amountMinor: 1000 });
const now = 1_800_000_000;
const ts = String(now);

test("assinatura certa e dentro da janela é aceite", () => {
  const signature = signPayload(secret, ts, body);
  assert.deepEqual(verifyWebhookSignature({ secret, rawBody: body, signature, timestamp: ts, nowSeconds: now }), { ok: true });
});

test("corpo alterado, segredo errado ou assinatura em falta são recusados", () => {
  const signature = signPayload(secret, ts, body);
  const check = (over: object) => verifyWebhookSignature({ secret, rawBody: body, signature, timestamp: ts, nowSeconds: now, ...over });
  assert.equal(check({ rawBody: body.replace("1000", "9999") }).ok, false);
  assert.equal(check({ secret: "outro" }).ok, false);
  assert.deepEqual(check({ signature: null }), { ok: false, reason: "missing_signature" });
  assert.deepEqual(check({ signature: "sha256=abc" }), { ok: false, reason: "bad_signature" });
});

test("timestamp antigo ou inválido (repetição de um pedido capturado) é recusado", () => {
  const signature = signPayload(secret, ts, body);
  assert.deepEqual(verifyWebhookSignature({ secret, rawBody: body, signature, timestamp: ts, nowSeconds: now + 600 }), { ok: false, reason: "stale_timestamp" });
  assert.deepEqual(verifyWebhookSignature({ secret, rawBody: body, signature, timestamp: "abc", nowSeconds: now }), { ok: false, reason: "missing_timestamp" });
});
