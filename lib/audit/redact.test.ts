import assert from "node:assert/strict";
import test from "node:test";
import { redact, REDACTED } from "./redact.ts";

test("segredos são redigidos em qualquer nível; o resto passa", () => {
  const out = redact({ name: "Ana", accessToken: "abc", nested: { apiKey: "k", ok: 1, list: [{ password: "p", city: "Luanda" }] }, when: new Date("2026-10-07T10:00:00Z") }) as { name: string; accessToken: string; nested: { apiKey: string; list: { password: string; city: string }[] }; when: string };
  assert.equal(out.name, "Ana");
  assert.equal(out.accessToken, REDACTED);
  assert.equal(out.nested.apiKey, REDACTED);
  assert.equal(out.nested.list[0].password, REDACTED);
  assert.equal(out.nested.list[0].city, "Luanda");
  assert.equal(out.when, "2026-10-07T10:00:00.000Z");
});

test("textos enormes e nulos são tratados", () => {
  assert.equal((redact("x".repeat(5000)) as string).length, 2001);
  assert.equal(redact(null), null);
  assert.equal(redact(undefined), null);
});
