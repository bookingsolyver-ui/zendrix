import test from "node:test";
import assert from "node:assert/strict";
import { suggestValues } from "./autofill.ts";

const maria = { name: "Maria Silva", waId: "244932267509", email: "maria@exemplo.com", painPoint: "Quer um orçamento de site", organizationName: "Wenove Lda" };

test("o nome vai para a variável que o precede («Olá {{1}}»)", () => {
  assert.deepEqual(suggestValues("Olá {{1}}, a sua encomenda {{2}} saiu.", ["1", "2"], maria), ["Maria", ""]); // encomenda: não é a organização
  assert.deepEqual(suggestValues("Caro(a) {{1}}, bem-vindo.", ["1"], maria), ["Maria"]);
  assert.deepEqual(suggestValues("Hi {{1}}!", ["1"], maria), ["Maria"]);
});

test("a primeira variável leva o primeiro nome por defeito; as outras ficam vazias sem pista", () => {
  assert.deepEqual(suggestValues("{{1}}, a sua consulta é a {{2}} às {{3}}.", ["1", "2", "3"], maria), ["Maria", "Wenove Lda", ""]);
});

test("mapeia e-mail, telemóvel, nome completo e necessidade pelo texto à volta", () => {
  const body = "Nome: {{1}}\nE-mail: {{2}}\nTelemóvel: {{3}}\nInteresse: {{4}}";
  assert.deepEqual(suggestValues(body, ["1", "2", "3", "4"], maria), ["Maria Silva", "maria@exemplo.com", "+244932267509", "Quer um orçamento de site"]);
});

test("sem dados, deixa vazio (nunca inventa) e um «nome» que é um número não conta", () => {
  assert.deepEqual(suggestValues("Olá {{1}}!", ["1"], { ...maria, name: null }), [""]);
  assert.deepEqual(suggestValues("Olá {{1}}!", ["1"], { ...maria, name: "+244932267509" }), [""]);
  assert.deepEqual(suggestValues("E-mail: {{1}}", ["1"], { ...maria, email: null }), [""]);
  assert.deepEqual(suggestValues("Sobre {{1}}", ["1"], { ...maria, painPoint: "x".repeat(150) }), [""]);
});

test("{{1}} é o nome do contacto e {{2}} o nome da organização, prontos a enviar", () => {
  assert.deepEqual(suggestValues("Olá {{1}}, bem-vindo à {{2}}!", ["1", "2"], maria), ["Maria", "Wenove Lda"]);
  assert.deepEqual(suggestValues("Olá {{1}}! Fala {{2}}, tudo bem?", ["1", "2"], maria), ["Maria", "Wenove Lda"]); // sem pista: a 2.ª é a organização
  assert.deepEqual(suggestValues("Empresa: {{1}}", ["1"], maria), ["Wenove Lda"]);
});

test("não preenche a organização onde o texto mostra que é outra coisa (data, valor, código…)", () => {
  assert.deepEqual(suggestValues("Olá {{1}}, o valor é {{2}}.", ["1", "2"], maria), ["Maria", ""]);
  assert.deepEqual(suggestValues("Olá {{1}}, no dia {{2}} às {{3}}.", ["1", "2", "3"], maria), ["Maria", "", ""]);
  assert.deepEqual(suggestValues("Olá {{1}}, código {{2}}", ["1", "2"], maria), ["Maria", ""]);
});

test("sem nome de organização, o campo fica vazio (nunca inventa)", () => {
  assert.deepEqual(suggestValues("Olá {{1}}, bem-vindo à {{2}}!", ["1", "2"], { ...maria, organizationName: null }), ["Maria", ""]);
});
