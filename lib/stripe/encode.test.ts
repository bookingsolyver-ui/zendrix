import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeForm, trialEndFor, MIN_TRIAL_SECONDS } from "./encode.ts";

test("encodeForm achata objetos e listas com chaves do Stripe", () => {
  const body = encodeForm({
    mode: "subscription",
    line_items: [{ price: "price_1", quantity: 1 }],
    subscription_data: { metadata: { workspace_id: "w 1" }, trial_end: undefined },
    allow_promotion_codes: true,
    empty: null,
  });
  assert.equal(
    decodeURIComponent(body),
    "mode=subscription&line_items[0][price]=price_1&line_items[0][quantity]=1&subscription_data[metadata][workspace_id]=w 1&allow_promotion_codes=true",
  );
});

test("trialEndFor só devolve o fim do teste quando ainda resta o mínimo do Stripe", () => {
  const now = Date.UTC(2026, 9, 1);
  const inDays = (d: number) => new Date(now + d * 86_400_000);
  assert.equal(trialEndFor("trialing", inDays(10), now), Math.floor(inDays(10).getTime() / 1000));
  assert.equal(trialEndFor("trialing", new Date(now + (MIN_TRIAL_SECONDS - 1) * 1000), now), undefined);
  assert.equal(trialEndFor("trialing", inDays(-1), now), undefined);
  assert.equal(trialEndFor("trialing", null, now), undefined);
  // Quem já teve subscrição não recebe teste novo.
  assert.equal(trialEndFor("canceled", inDays(10), now), undefined);
  assert.equal(trialEndFor("past_due", inDays(10), now), undefined);
});
