import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCreatePayload, buildTemplateMessage, checkParams, readMetaComponents, renderTemplate } from "./meta-payload.ts";

test("buildCreatePayload: exemplos por variável e valor por defeito", () => {
  const payload = buildCreatePayload({ name: "x", category: "UTILITY", language: "pt_PT", body: "Olá {{1}}, {{2}}" }, ["Ana"]);
  assert.deepEqual(payload.components[0].example, { body_text: [["Ana", "exemplo"]] });
  assert.equal(buildCreatePayload({ name: "x", category: "UTILITY", language: "en", body: "Hi" }, []).components[0].example, undefined);
});

test("readMetaComponents: cabeçalho de imagem ou botão com variável não é enviável", () => {
  assert.equal(readMetaComponents([{ type: "BODY", text: "oi" }]).sendable, true);
  assert.equal(readMetaComponents([{ type: "HEADER", format: "IMAGE" }, { type: "BODY", text: "oi" }]).sendable, false);
  assert.equal(readMetaComponents([{ type: "BODY", text: "oi" }, { type: "BUTTONS", buttons: [{ type: "URL", url: "https://a/{{1}}" }] }]).sendable, false);
  assert.equal(readMetaComponents([]).sendable, false);
});

test("checkParams: exige todas as variáveis e limpa quebras de linha", () => {
  assert.deepEqual(checkParams("Olá {{1}}", ["Ana\nMaria"]), ["Ana Maria"]);
  assert.equal(checkParams("Olá {{1}}", []), null);
  assert.equal(checkParams("Olá {{1}}", ["  "]), null);
  assert.deepEqual(checkParams("Sem variáveis", []), []);
});

test("buildTemplateMessage e renderTemplate", () => {
  assert.equal(renderTemplate("Olá {{1}}, {{2}}", ["Ana", "bom dia"]), "Olá Ana, bom dia");
  const msg = buildTemplateMessage("351", "t", "pt_PT", ["Ana"]);
  assert.deepEqual(msg.template.components, [{ type: "body", parameters: [{ type: "text", text: "Ana" }] }]);
  assert.equal(buildTemplateMessage("351", "t", "pt_PT", []).template.components, undefined);
});
