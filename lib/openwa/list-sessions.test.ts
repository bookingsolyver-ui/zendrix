import test from "node:test";
import assert from "node:assert/strict";
import { extractSessionArray } from "./client.ts";

test("extractSessionArray: array direto e formatos embrulhados", () => {
  const rows = [{ id: "a", name: "zx-1" }];
  assert.deepEqual(extractSessionArray(rows), rows);
  assert.deepEqual(extractSessionArray({ data: rows }), rows);
  assert.deepEqual(extractSessionArray({ sessions: rows }), rows);
  assert.deepEqual(extractSessionArray({ response: rows }), rows);
  assert.deepEqual(extractSessionArray({ data: { sessions: rows } }), rows);
  assert.deepEqual(extractSessionArray({ ok: true, whatever: rows }), rows);
});

test("extractSessionArray: formatos desconhecidos dão null (nunca lança)", () => {
  assert.equal(extractSessionArray(null), null);
  assert.equal(extractSessionArray("x"), null);
  assert.equal(extractSessionArray({ error: "nope" }), null);
  assert.equal(extractSessionArray({ a: [1], b: [2] }), null); // ambíguo
});
