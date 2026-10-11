import test from "node:test";
import assert from "node:assert/strict";
import { decideNameStep, extractName, NAME_ASK_TEXT } from "./name-capture.ts";

test("extractName: aceita nomes e tira as frases de introdução", () => {
  assert.equal(extractName("maria silva"), "Maria Silva");
  assert.equal(extractName("O meu nome é João da Costa."), "João da Costa");
  assert.equal(extractName("Chamo-me Ana"), "Ana");
  assert.equal(extractName("my name is john smith"), "John Smith");
  assert.equal(extractName("  Rui   Pedro  "), "Rui Pedro");
});

test("extractName: recusa o que não é um nome", () => {
  for (const bad of ["", "ok", "Sim", "Olá", "bom dia", "quero saber o preço", "Quanto custa?", "123", "+244923000111", "a@b.com", "https://x.com", "x".repeat(70), "um dois três quatro cinco seis"]) {
    assert.equal(extractName(bad), null, bad);
  }
});

test("decideNameStep: pergunta uma vez, em conversas novas, e só grava depois da pergunta", () => {
  const base = { contactHasName: false, hasOutgoing: false, askedBefore: false, lastOutgoingIsAsk: false, inboundText: "Olá" };
  assert.equal(decideNameStep(base), "ask");
  assert.equal(decideNameStep({ ...base, contactHasName: true }), "skip");
  assert.equal(decideNameStep({ ...base, hasOutgoing: true }), "skip"); // conversa antiga: não incomoda
  assert.equal(decideNameStep({ ...base, askedBefore: true, hasOutgoing: true, lastOutgoingIsAsk: true, inboundText: "Maria Silva" }), "capture");
  assert.equal(decideNameStep({ ...base, askedBefore: true, hasOutgoing: true, lastOutgoingIsAsk: true, inboundText: "quanto custa?" }), "skip");
  assert.equal(decideNameStep({ ...base, askedBefore: true, hasOutgoing: true, lastOutgoingIsAsk: false, inboundText: "Maria" }), "skip");
  assert.ok(NAME_ASK_TEXT.endsWith(":"));
});
