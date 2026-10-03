import { test } from "node:test";
import assert from "node:assert/strict";
import { extractEmail, isOptOut, nextStage, normalizeEmail, sanitizeLeadUpdate, stageAfterPayment, stageAfterPaymentLink, type LeadIntent, type LeadStageName } from "./lead.ts";

test("estado do lead: só avança, WON só pelo pagamento, LOST reabre", () => {
  const cases: [LeadStageName, LeadIntent, LeadStageName][] = [
    ["NEW", "interested", "ENGAGED"],
    ["NEW", "ready_to_buy", "QUALIFIED"],
    ["NEW", "none", "NEW"],
    ["ENGAGED", "interested", "ENGAGED"],
    ["ENGAGED", "ready_to_buy", "QUALIFIED"],
    ["QUALIFIED", "interested", "QUALIFIED"], // não recua
    ["QUALIFIED", "ready_to_buy", "QUALIFIED"],
    ["PAYMENT_SENT", "interested", "PAYMENT_SENT"],
    ["PAYMENT_SENT", "ready_to_buy", "PAYMENT_SENT"], // não recua para QUALIFIED
    ["PAYMENT_SENT", "not_interested", "LOST"],
    ["QUALIFIED", "not_interested", "LOST"],
    ["LOST", "interested", "ENGAGED"],
    ["LOST", "ready_to_buy", "QUALIFIED"],
    ["LOST", "none", "LOST"],
    ["WON", "not_interested", "WON"], // nada tira um cliente que pagou
    ["WON", "ready_to_buy", "WON"],
    ["WON", "interested", "WON"],
  ];
  for (const [from, intent, to] of cases) assert.equal(nextStage(from, intent), to, `${from} + ${intent}`);
  assert.equal(stageAfterPaymentLink("QUALIFIED"), "PAYMENT_SENT");
  assert.equal(stageAfterPaymentLink("LOST"), "PAYMENT_SENT");
  assert.equal(stageAfterPaymentLink("WON"), "WON");
  assert.equal(stageAfterPayment(), "WON");
});

test("e-mail: validação estrita e extração de texto livre", () => {
  assert.equal(normalizeEmail("  Ana.Silva@Empresa.PT "), "ana.silva@empresa.pt");
  for (const bad of ["", "ana", "ana@", "@x.pt", "ana@x", "a b@x.pt", "ana@x..pt", 42, null, undefined, "a@b.c", `${"x".repeat(250)}@a.pt`]) {
    assert.equal(normalizeEmail(bad), null, String(bad));
  }
  assert.equal(extractEmail("O meu email é Ana@Loja.com, obrigada"), "ana@loja.com");
  assert.equal(extractEmail("sem email aqui"), null);
});

test("atualizar_lead: nada do modelo vai cru para a base de dados", () => {
  const ok = sanitizeLeadUpdate({ nome: "  Ana   Silva ", email: "ANA@loja.pt", dor_principal: "Perco  clientes\nfora de horas", intencao: "ready_to_buy" });
  assert.deepEqual(ok, { name: "Ana Silva", email: "ana@loja.pt", painPoint: "Perco clientes fora de horas", intent: "ready_to_buy", rejected: [] });

  const bad = sanitizeLeadUpdate({ nome: "ana@x.pt", email: "não é email", dor_principal: "   ", intencao: "comprar_ja" });
  assert.deepEqual(bad, { rejected: ["nome", "email", "dor_principal", "intencao"] });

  // sem ligações nem caracteres invisíveis/de controlo; limites de tamanho
  assert.equal(sanitizeLeadUpdate({ dor_principal: "veja https://evil.test/x agora\u0000​" }).painPoint, "veja agora");
  assert.equal(sanitizeLeadUpdate({ nome: "x".repeat(500) }).name?.length, 80);
  assert.equal(sanitizeLeadUpdate({ dor_principal: "y".repeat(900) }).painPoint?.length, 300);
  // tipos errados do modelo não rebentam
  assert.deepEqual(sanitizeLeadUpdate({ nome: 5, email: {}, dor_principal: [], intencao: null }).rejected, ["nome", "email", "dor_principal", "intencao"]);
  assert.deepEqual(sanitizeLeadUpdate({}), { rejected: [] });
});

test("opt-out: só o pedido inteiro conta, nunca uma frase normal", () => {
  for (const yes of ["STOP", "Stop!", "parar", "Parar mensagens", "sair", "Cancelar", "unsubscribe", "Não quero receber mensagens", "nao quero mais mensagens", "Não quero mais receber contactos", "não me contactem mais", "Do not contact me", "No quiero recibir mensajes", "dejar de recibir mensajes", "  PARAR  ", "stop 🛑"]) {
    assert.equal(isOptOut(yes), true, yes);
  }
  for (const no of ["", "olá", "preciso parar o serviço de ontem", "não quero o plano Pro", "quero cancelar a minha encomenda #4821", "podem parar de me ligar às 9h? obrigado", "stop the car", "chega amanhã?", "sair às 18h pode ser?", "quero saber o preço", "não quero receber o produto danificado", "a".repeat(200)]) {
    assert.equal(isOptOut(no), false, no);
  }
});
