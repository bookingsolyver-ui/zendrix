import { test } from "node:test";
import assert from "node:assert/strict";
import { splitText, TEXT_LIMITS } from "./split-text.ts";
import { backoffSeconds, classifyMetaFailure, MAX_ATTEMPTS } from "../meta/errors.ts";

test("splitText: texto curto fica inteiro e o limite de caracteres é respeitado", () => {
  assert.deepEqual(splitText("  olá  ", TEXT_LIMITS.WHATSAPP), ["olá"]);
  const long = Array.from({ length: 60 }, (_, i) => `Frase número ${i} termina aqui.`).join(" ");
  const parts = splitText(long, { maxChars: 200 });
  assert.ok(parts.length > 1);
  for (const p of parts) assert.ok(p.length <= 200, `${p.length}`);
  assert.equal(parts.join(" ").replace(/\s+/g, " "), long.replace(/\s+/g, " "), "não se perde texto");
});

test("splitText: Instagram conta bytes (acentos e emojis ocupam mais)", () => {
  const text = "Olá, tudo bem? Çã é ü 🙂 ".repeat(80);
  const parts = splitText(text, TEXT_LIMITS.INSTAGRAM);
  assert.ok(parts.length > 1);
  for (const p of parts) assert.ok(Buffer.byteLength(p, "utf8") <= 1000, `${Buffer.byteLength(p, "utf8")} bytes`);
});

test("splitText: nunca parte um emoji ao meio e corta palavras só em último caso", () => {
  const parts = splitText("😀".repeat(50), { maxChars: 7 });
  for (const p of parts) assert.ok(!/[\ud800-\udbff]$/.test(p) && !/^[\udc00-\udfff]/.test(p));
  assert.equal(parts.join(""), "😀".repeat(50));
  assert.deepEqual(splitText("a".repeat(25), { maxChars: 10 }).map((p) => p.length), [10, 10, 5]);
});

test("classifyMetaFailure: o que se repete e o que não", () => {
  assert.equal(classifyMetaFailure({ network: true }).kind, "transient");
  assert.equal(classifyMetaFailure({ httpStatus: 429 }).kind, "transient");
  assert.equal(classifyMetaFailure({ httpStatus: 503 }).kind, "transient");
  assert.equal(classifyMetaFailure({ httpStatus: 400, code: 130429 }).kind, "transient");
  assert.equal(classifyMetaFailure({ httpStatus: 400, code: 4 }).kind, "transient");
  // Nunca repetir: token, janela de 24 h, spam/qualidade, pedido inválido.
  assert.deepEqual(classifyMetaFailure({ httpStatus: 401, code: 190 }), { kind: "permanent", reason: "token_expired" });
  assert.equal(classifyMetaFailure({ httpStatus: 400, code: 131047 }).reason, "window_closed");
  assert.equal(classifyMetaFailure({ httpStatus: 400, code: 131048 }).kind, "permanent");
  assert.equal(classifyMetaFailure({ httpStatus: 400, code: 368 }).kind, "permanent");
  assert.equal(classifyMetaFailure({ httpStatus: 400 }).kind, "permanent");
});

test("backoffSeconds duplica a cada tentativa", () => {
  const mid = () => 0.5; // sem aleatoriedade
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => backoffSeconds(n, mid)), [30, 60, 120, 240, 480]);
  assert.ok(MAX_ATTEMPTS >= 3);
});

import { buildTextRequest } from "../meta/request.ts";

test("buildTextRequest: cada plataforma tem o seu endpoint, corpo e id de resposta", () => {
  const wa = buildTextRequest("WHATSAPP", { accountId: "PHONE1" }, "351900", "olá");
  assert.equal(wa.path, "PHONE1/messages");
  assert.deepEqual(wa.body, { messaging_product: "whatsapp", recipient_type: "individual", to: "351900", type: "text", text: { body: "olá" } });
  assert.equal(wa.externalId({ messages: [{ id: "wamid.1" }] }), "wamid.1");

  const fb = buildTextRequest("MESSENGER", { accountId: "PAGE1" }, "psid1", "olá");
  assert.equal(fb.path, "PAGE1/messages");
  assert.deepEqual(fb.body, { messaging_type: "RESPONSE", recipient: { id: "psid1" }, message: { text: "olá" } });
  assert.equal(fb.externalId({ recipient_id: "psid1", message_id: "m_1" }), "m_1");

  // Instagram envia pela página ligada, se houver; senão pelo id da conta.
  assert.equal(buildTextRequest("INSTAGRAM", { accountId: "IG1", pageId: "PAGE9" }, "igsid", "x").path, "PAGE9/messages");
  const ig = buildTextRequest("INSTAGRAM", { accountId: "IG1" }, "igsid", "olá");
  assert.equal(ig.path, "IG1/messages");
  assert.deepEqual(ig.body, { recipient: { id: "igsid" }, message: { text: "olá" } });

  for (const r of [wa, fb, ig]) assert.equal(r.externalId(null), null);
});
