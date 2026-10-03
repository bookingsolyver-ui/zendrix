import assert from "node:assert/strict";
import test from "node:test";
import { templateInputSchema, templateVariables } from "./schema.ts";

test("nome de modelo: minúsculas, números e sublinhado", () => {
  const base = { category: "UTILITY", language: "pt_PT", body: "Olá {{1}}" };
  assert.ok(templateInputSchema.safeParse({ ...base, name: "boas_vindas_2" }).success);
  assert.equal(templateInputSchema.safeParse({ ...base, name: "Boas Vindas" }).success, false);
  assert.equal(templateInputSchema.safeParse({ ...base, name: "boas-vindas" }).success, false);
  assert.equal(templateInputSchema.safeParse({ ...base, name: "ok", body: "" }).success, false);
});

test("deteta as variáveis do texto, ordenadas e sem repetições", () => {
  assert.deepEqual(templateVariables("Olá {{2}}, pedido {{1}}. {{1}} de novo"), ["1", "2"]);
  assert.deepEqual(templateVariables("sem variáveis"), []);
});
