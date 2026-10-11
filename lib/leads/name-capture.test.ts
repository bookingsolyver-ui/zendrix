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

import { dropNameExchange, findOriginalRequest, isGreetingOnly, NAME_RETRY_TEXT, nameAckText } from "./name-capture.ts";

test("decideNameStep: a primeira resposta a um contacto sem nome é SEMPRE o pedido do nome", () => {
  const base = { contactHasName: false, asks: 0, lastOutgoingIsAsk: false, inboundText: "Quero saber o preço" };
  assert.equal(decideNameStep(base), "ask"); // nem em conversas antigas se responde à dúvida primeiro
  assert.equal(decideNameStep({ ...base, inboundText: "Olá" }), "ask");
  assert.equal(decideNameStep({ ...base, contactHasName: true }), "skip");
});

test("decideNameStep: grava o nome, repete uma vez se não for um nome, e depois deixa o agente seguir", () => {
  const asked = { contactHasName: false, asks: 1, lastOutgoingIsAsk: true };
  assert.equal(decideNameStep({ ...asked, inboundText: "João Silva" }), "capture");
  assert.equal(decideNameStep({ ...asked, inboundText: "quanto custa?" }), "retry");
  assert.equal(decideNameStep({ ...asked, asks: 2, inboundText: "quanto custa?" }), "skip"); // nunca prende o cliente
  assert.equal(decideNameStep({ ...asked, asks: 2, inboundText: "Maria" }), "capture");
  assert.equal(decideNameStep({ ...asked, lastOutgoingIsAsk: false, inboundText: "Maria" }), "skip");
  assert.ok(NAME_ASK_TEXT.endsWith(":") && NAME_RETRY_TEXT.length > 20);
});

test("o pedido original: a última mensagem antes do pedido do nome que não seja só uma saudação", () => {
  const h = (rows: [("IN" | "OUT"), string][]) => rows.map(([direction, body]) => ({ direction, body }));
  assert.equal(findOriginalRequest(h([["IN", "Quero saber o preço"], ["OUT", NAME_ASK_TEXT], ["IN", "João Silva"]])), "Quero saber o preço");
  assert.equal(findOriginalRequest(h([["IN", "Olá"], ["IN", "Qual o horário de sábado?"], ["OUT", NAME_ASK_TEXT], ["IN", "Rui"]])), "Qual o horário de sábado?");
  assert.equal(findOriginalRequest(h([["IN", "Olá, bom dia!"], ["OUT", NAME_ASK_TEXT], ["IN", "Ana Costa"]])), null);
  assert.equal(isGreetingOnly("Boa tarde, tudo bem?"), true);
  assert.equal(isGreetingOnly("Olá, quero um orçamento"), false);
});

test("depois do nome: o modelo lê o pedido original como a última coisa que o cliente disse", () => {
  const ack = nameAckText("João", true);
  assert.equal(ack, "Prazer, João!");
  assert.equal(nameAckText("João"), "Prazer, João! Como posso ajudar?");
  const history = [
    { direction: "IN" as const, body: "Quero saber o preço" },
    { direction: "OUT" as const, body: NAME_ASK_TEXT },
    { direction: "IN" as const, body: "João Silva" },
    { direction: "OUT" as const, body: ack },
  ];
  assert.deepEqual(dropNameExchange(history, ack).map((e) => e.body), ["Quero saber o preço"]);
});
