import assert from "node:assert/strict";
import test from "node:test";
import { nameSimilarity, phoneKey, scorePair, type ContactLike } from "./similarity.ts";

const c = (id: string, name: string | null, waId: string, email: string | null = null, platform = "WHATSAPP"): ContactLike => ({ id, name, waId, email, platform });

test("«Joao Silva» e «João H. Silva» são o mesmo nome; homónimos diferentes não", () => {
  assert.ok(nameSimilarity("Joao Silva", "João H. Silva") >= 0.95);
  assert.ok(nameSimilarity("J. Silva", "João Silva") >= 0.85);
  assert.ok(nameSimilarity("Joao Silva", "Maria Costa") < 0.4);
});

test("o telefone compara-se sem indicativo", () => {
  assert.equal(phoneKey("244922123456"), "922123456");
  assert.equal(phoneKey("922123456"), "922123456");
  assert.equal(phoneKey("1234"), null);
});

test("mesmo telefone + nome parecido = candidato forte; nomes diferentes caem abaixo do limiar", () => {
  const hit = scorePair(c("1", "Joao Silva", "922123456"), c("2", "João H. Silva", "244922123456"));
  assert.ok(hit && hit.score >= 0.95);
  assert.ok(hit.reasons.includes("mesmo telefone"));
  assert.equal(scorePair(c("1", "Joao Silva", "922123456"), c("2", "Maria Costa", "244922123456")), null);
});

test("sem telefone nem e-mail em comum não há candidato, mesmo com o nome igual", () => {
  assert.equal(scorePair(c("1", "Joao Silva", "922111111"), c("2", "Joao Silva", "922222222")), null);
  assert.ok(scorePair(c("1", "Ana", "111", "a@x.pt", "INSTAGRAM"), c("2", "Ana", "222", "A@x.pt", "MESSENGER")));
});
