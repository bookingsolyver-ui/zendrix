import assert from "node:assert/strict";
import test from "node:test";
import { decideProfileAccess, profileBucketKey } from "./anomaly.ts";

test("até 50 perfis por minuto passa; o 51.º dispara o bloqueio", () => {
  assert.deepEqual(decideProfileAccess(50), { allowed: true });
  assert.deepEqual(decideProfileAccess(51), { allowed: false, reason: "limit_exceeded" });
});

test("o contador é por organização e por utilizador", () => {
  assert.notEqual(profileBucketKey("w1", "u1"), profileBucketKey("w2", "u1"));
  assert.notEqual(profileBucketKey("w1", "u1"), profileBucketKey("w1", "u2"));
});
