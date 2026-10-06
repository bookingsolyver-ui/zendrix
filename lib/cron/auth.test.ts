import assert from "node:assert/strict";
import test from "node:test";
import { checkCronHeader } from "./auth.ts";

const SECRET = "s3cr3t-valor-de-teste-1234567890abcdef";

test("o formato do workflow («Authorization: Bearer <segredo>») é aceite", () => {
  assert.deepEqual(checkCronHeader(`Bearer ${SECRET}`, SECRET), { ok: true });
});

test("um espaço ou mudança de linha a mais, no segredo ou no cabeçalho, já não causa um 401", () => {
  assert.equal(checkCronHeader(`Bearer ${SECRET}\n`, SECRET).ok, true);
  assert.equal(checkCronHeader(`Bearer ${SECRET} `, SECRET).ok, true);
  assert.equal(checkCronHeader(`Bearer ${SECRET}`, `${SECRET}\n`).ok, true); // o valor guardado na Vercel acabava em \n
  assert.equal(checkCronHeader(`Bearer ${SECRET}`, ` ${SECRET} `).ok, true);
  assert.equal(checkCronHeader(`bearer ${SECRET}`, SECRET).ok, true);
  assert.equal(checkCronHeader(`BEARER   ${SECRET}`, SECRET).ok, true);
});

test("um segredo diferente continua recusado, e diz-se porquê (só tamanhos, nunca valores)", () => {
  const result = checkCronHeader("Bearer outro-segredo", SECRET);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "secret_mismatch");
  assert.equal(result.receivedLength, "outro-segredo".length);
  assert.equal(result.expectedLength, SECRET.length);
  assert.ok(!JSON.stringify(result).includes(SECRET) && !JSON.stringify(result).includes("outro-segredo"));
  assert.equal(checkCronHeader(`Bearer ${SECRET.slice(0, -1)}`, SECRET).ok, false); // segredo cortado
  assert.equal(checkCronHeader(`Bearer ${SECRET}x`, SECRET).ok, false);
});

test("sem cabeçalho ou com outro esquema: recusado com o motivo certo", () => {
  assert.deepEqual(checkCronHeader(null, SECRET), { ok: false, reason: "missing_header" });
  assert.deepEqual(checkCronHeader("   ", SECRET), { ok: false, reason: "missing_header" });
  assert.deepEqual(checkCronHeader(SECRET, SECRET), { ok: false, reason: "wrong_scheme" });
  assert.deepEqual(checkCronHeader(`Basic ${SECRET}`, SECRET), { ok: false, reason: "wrong_scheme" });
  assert.equal(checkCronHeader("Bearer ", SECRET).ok, false);
});
