import { test } from "node:test";
import assert from "node:assert/strict";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "./api-keys.ts";
import { grantableRoles, roleAtLeast } from "./roles.ts";

test("generateApiKey: formato válido, hash coerente e chaves distintas", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.ok(looksLikeApiKey(a.key));
  assert.ok(a.key.startsWith(`${a.prefix}_`));
  assert.equal(a.hash, hashApiKey(a.key));
  assert.equal(a.hash.length, 64);
  assert.notEqual(a.key, b.key);
  assert.notEqual(a.hash, b.hash);
});

test("looksLikeApiKey rejeita lixo", () => {
  for (const bad of ["", "abc", "zxk_short_x", `zxk_12345678_${"x".repeat(42)}`, `ZXK_12345678_${"x".repeat(43)}`, `zxk_1234567!_${"x".repeat(43)}`]) {
    assert.equal(looksLikeApiKey(bad), false, bad);
  }
});

test("hierarquia de papéis", () => {
  assert.ok(roleAtLeast("OWNER", "MANAGER"));
  assert.ok(roleAtLeast("MANAGER", "MANAGER"));
  assert.ok(!roleAtLeast("STAFF", "MANAGER"));
  assert.deepEqual(grantableRoles("OWNER"), ["MANAGER", "STAFF"]);
  assert.deepEqual(grantableRoles("MANAGER"), ["STAFF"]);
  assert.deepEqual(grantableRoles("STAFF"), []);
});
