import test from "node:test";
import assert from "node:assert/strict";
import { contactChoiceLabel, contactTitle, NO_NAME, visibleName } from "./display.ts";

test("um «nome» que é só um número de telemóvel não conta como nome", () => {
  for (const phone of ["+244932267509", "+244 932 267 509", "00351 912 345 678", "(244) 932-267-509", "932267509"]) {
    assert.equal(visibleName(phone), null, phone);
  }
  assert.equal(visibleName("Maria Silva"), "Maria Silva");
  assert.equal(visibleName("Loja 24h"), "Loja 24h"); // tem letras: é um nome
  assert.equal(visibleName("🔥"), "🔥");
  assert.equal(visibleName("​ㅤ"), null);
});

test("contactTitle nunca mostra o número; contactChoiceLabel só o fim, para distinguir", () => {
  assert.equal(contactTitle(null, "244932267509"), NO_NAME);
  assert.equal(contactTitle("+244932267509", "244932267509"), NO_NAME);
  assert.equal(contactTitle("Ana", "244932267509"), "Ana");
  assert.equal(contactChoiceLabel("", "244932267509"), "Sem nome · …7509");
  assert.equal(contactChoiceLabel("Ana", "244932267509"), "Ana");
  assert.ok(!contactTitle(null, "244932267509").includes("244"));
});
