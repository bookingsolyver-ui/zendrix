import test from "node:test";
import assert from "node:assert/strict";
import { extractSessionArray } from "./parse-sessions.ts";

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

test("isTunnelOffline: reconhece a página de erro do ngrok e ignora erros reais do OpenWA", async () => {
  const { isTunnelOffline } = await import("./parse-sessions.ts");
  assert.equal(
    isTunnelOffline(
      "The endpoint x.ngrok-free.dev is offline.\r\n\r\nERR_NGROK_3200",
    ),
    true,
  );
  assert.equal(isTunnelOffline("<html>ngrok</html>"), true);
  assert.equal(
    isTunnelOffline(
      '{"statusCode":409,"message":"Session name already exists"}',
    ),
    false,
  );
  assert.equal(isTunnelOffline(""), false);
  assert.equal(isTunnelOffline(null), false);
});
