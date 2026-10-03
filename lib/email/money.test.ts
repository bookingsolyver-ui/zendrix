import assert from "node:assert/strict";
import test from "node:test";
import { formatMoney } from "./money.ts";

test("valores em cêntimos aparecem como dinheiro na língua do leitor", () => {
  assert.match(formatMoney(2990, "eur", "pt"), /29,90\s?€/);
  assert.match(formatMoney(2990, "EUR", "en"), /€29\.90/);
  assert.match(formatMoney(2990, "eur", "es"), /29,90\s?€/);
  assert.match(formatMoney(100000, "usd", "en"), /\$1,000\.00/);
});

test("uma moeda inválida nunca rebenta o e-mail", () => {
  assert.equal(formatMoney(1234, "xx!", "pt"), "12.34 XX!");
});
