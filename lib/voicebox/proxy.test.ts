import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request as rawRequest } from "node:http";
import { spawn } from "node:child_process";
import type { AddressInfo } from "node:net";

// O proxy de verdade (scripts/voicebox-proxy.mjs) contra uma «Voicebox» falsa: chave obrigatória e lista de rotas.
test("o proxy exige a chave e só deixa passar as rotas de geração", async () => {
  const seen: string[] = [];
  const backend = createServer((req, res) => { seen.push(`${req.method} ${req.url} auth=${req.headers.authorization ?? "-"}`); res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}'); });
  await new Promise<void>((r) => backend.listen(0, "127.0.0.1", r));
  const backendPort = (backend.address() as AddressInfo).port;
  const port = 18000 + Math.floor(Math.random() * 1000);
  const KEY = "k".repeat(40);
  const proxy = spawn(process.execPath, ["scripts/voicebox-proxy.mjs"], { env: { ...process.env, VOICEBOX_PROXY_KEY: KEY, VOICEBOX_TARGET: `http://127.0.0.1:${backendPort}`, PORT: String(port) }, stdio: "pipe" });
  try {
    await new Promise<void>((resolve, reject) => { proxy.stdout.on("data", (d) => String(d).includes("Proxy do Voicebox") && resolve()); proxy.on("error", reject); setTimeout(() => reject(new Error("proxy não arrancou")), 5000); });
    const call = (method: string, path: string, key?: string) => fetch(`http://127.0.0.1:${port}${path}`, { method, headers: key ? { Authorization: `Bearer ${key}` } : {}, ...(method === "POST" ? { body: "{}" } : {}) }).then((r) => r.status);
    assert.equal(await call("GET", "/profiles"), 401); // sem chave
    assert.equal(await call("GET", "/profiles", "errada".repeat(8)), 401);
    assert.equal(await call("GET", "/profiles", KEY), 200);
    assert.equal(await call("POST", "/generate", KEY), 200);
    assert.equal(await call("GET", "/history/abc-123", KEY), 200);
    assert.equal(await call("GET", "/audio/abc-123", KEY), 200);
    // O que NUNCA se expõe:
    assert.equal(await call("POST", "/models/download", KEY), 404);
    assert.equal(await call("DELETE", "/history/abc-123", KEY), 404);
    assert.equal(await call("POST", "/profiles/import", KEY), 404);
    // O fetch normaliza «..» antes de enviar; um cliente malicioso envia o caminho tal e qual:
    const raw = await new Promise<number>((resolve, reject) => {
      const req = rawRequest({ host: "127.0.0.1", port, path: "/history/../models/download", method: "GET", headers: { Authorization: `Bearer ${KEY}` } }, (res) => { res.resume(); resolve(res.statusCode ?? 0); });
      req.on("error", reject); req.end();
    });
    assert.equal(raw, 404);
    assert.ok(seen.every((line) => line.endsWith("auth=-")), "a chave não segue para a Voicebox");
  } finally {
    proxy.kill();
    backend.close();
  }
});
