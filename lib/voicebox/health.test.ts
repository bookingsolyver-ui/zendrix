import test from "node:test";
import assert from "node:assert/strict";
import { voiceboxHealth } from "./health.ts";
import { openWaHealth } from "../openwa/health.ts";

const ENV = { VOICEBOX_URL: "https://voz.exemplo.com", OPENWA_URL: "https://wa.exemplo.com", OPENWA_API_KEY: "k".repeat(40) };
const respond = (status: number) => (async () => new Response("", { status })) as unknown as typeof fetch;
const refuse = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
const timeout = (async () => { throw new DOMException("t", "TimeoutError"); }) as unknown as typeof fetch;

test("Voicebox: sem configuração, inacessível ou a responder; nunca lança", async () => {
  assert.deepEqual((await voiceboxHealth(respond(200), {})).configured, false);
  assert.equal((await voiceboxHealth(respond(404), ENV)).reachable, true); // o proxy só abre a rota de síntese
  assert.equal((await voiceboxHealth(respond(401), ENV)).reachable, true);
  assert.equal((await voiceboxHealth(respond(502), ENV)).reachable, false);
  const down = await voiceboxHealth(refuse, ENV);
  assert.equal(down.reachable, false);
  assert.match(down.detail ?? "", /sem ligação/);
  assert.match((await voiceboxHealth(timeout, ENV)).detail ?? "", /sem resposta/);
});

test("OpenWA: separa servidor em baixo, chave recusada e tudo bem", async () => {
  assert.equal((await openWaHealth(respond(200), {})).configured, false);
  assert.equal((await openWaHealth(refuse, ENV)).reachable, false);
  assert.equal((await openWaHealth(respond(503), ENV)).reachable, false);
  const calls: string[] = [];
  const mixed = (async (url: string) => { calls.push(url); return new Response("", { status: url.endsWith("/api/health") ? 200 : 401 }); }) as unknown as typeof fetch;
  const wrongKey = await openWaHealth(mixed, ENV);
  assert.equal(wrongKey.reachable, true);
  assert.equal(wrongKey.authOk, false);
  assert.equal((await openWaHealth(respond(200), ENV)).authOk, true);
});
