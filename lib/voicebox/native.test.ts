import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { generateWav, __resetProfileCache } from "./native.ts";
import { voiceboxConfig } from "./config.ts";

// Um servidor Voicebox 0.5 FALSO, com o mesmo contrato (/profiles, /generate, /history/{id}, /audio/{id}).
const WAV = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(200, 1)]);
interface Fake { server: Server; url: string; log: string[]; polls: () => number; }

async function fake(opts: { pollsUntilDone?: number; failed?: boolean; noProfile?: boolean; stuck?: boolean; key?: string } = {}): Promise<Fake> {
  const log: string[] = [];
  let polls = 0;
  const server = createServer((req, res) => {
    log.push(`${req.method} ${req.url}`);
    if (opts.key && req.headers.authorization !== `Bearer ${opts.key}`) { res.writeHead(401).end("{}"); return; }
    const send = (status: number, body: unknown, type = "application/json") => { res.writeHead(status, { "content-type": type }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
    if (req.url === "/profiles") return send(200, opts.noProfile ? [] : [{ id: "b10c86a4-1111-2222-3333-444455556666", name: "OLYVER", language: "pt" }]);
    if (req.url === "/generate" && req.method === "POST") {
      let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => { log.push(`BODY ${raw}`); send(200, { id: "gen-1", status: "generating" }); });
      return;
    }
    if (req.url === "/history/gen-1") { polls++; return send(200, { id: "gen-1", status: opts.stuck ? "generating" : opts.failed && polls >= 2 ? "failed" : polls > (opts.pollsUntilDone ?? 2) ? "completed" : "generating" }); }
    if (req.url === "/audio/gen-1") return send(200, WAV, "audio/wav");
    if (req.url === "/generate/gen-1/cancel") return send(200, {});
    send(404, { detail: "Not Found" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, log, polls: () => polls };
}
const cfg = (url: string, extra: Record<string, string> = {}) => voiceboxConfig({ VOICEBOX_URL: url, VOICEBOX_PROFILE: "olyver", VOICEBOX_TIMEOUT_MS: "4000", ...extra })!;
const stop = (f: Fake) => new Promise<void>((resolve) => f.server.close(() => resolve()));

test("gera: resolve o perfil pelo nome, espera pelo fim (polling) e descarrega o WAV", async () => {
  __resetProfileCache();
  const f = await fake({ pollsUntilDone: 2, key: "segredo" });
  const wav = await generateWav(cfg(f.url, { VOICEBOX_API_KEY: "segredo" }), "Olá, bem-vindo!");
  assert.equal(wav.subarray(0, 4).toString(), "RIFF");
  assert.ok(f.polls() >= 3, "tem de esperar pelo estado «completed»");
  const body = JSON.parse(f.log.find((l) => l.startsWith("BODY "))!.slice(5));
  assert.deepEqual({ profile: body.profile_id, lang: body.language, engine: body.engine, size: body.model_size }, { profile: "b10c86a4-1111-2222-3333-444455556666", lang: "pt", engine: "qwen", size: "1.7B" });
  assert.equal(body.text, "Olá, bem-vindo!");
  await stop(f);
});

test("falhas limpas: perfil inexistente, geração falhada, chave recusada", async () => {
  __resetProfileCache();
  let f = await fake({ noProfile: true });
  await assert.rejects(generateWav(cfg(f.url), "x"), /profile not found/);
  await stop(f);
  __resetProfileCache();
  f = await fake({ failed: true });
  await assert.rejects(generateWav(cfg(f.url), "x"), /generation failed/);
  await stop(f);
  __resetProfileCache();
  f = await fake({ key: "certa" });
  await assert.rejects(generateWav(cfg(f.url, { VOICEBOX_API_KEY: "errada" }), "x"), /Voicebox 401/);
  await stop(f);
});

test("prazo: se a geração não acaba, desiste a tempo e cancela no servidor", async () => {
  __resetProfileCache();
  const f = await fake({ stuck: true });
  const started = Date.now();
  await assert.rejects(generateWav(cfg(f.url, { VOICEBOX_TIMEOUT_MS: "1500" }), "x"), /Voicebox timeout/);
  assert.ok(Date.now() - started < 3000, "não pode ultrapassar muito o prazo");
  await new Promise((r) => setTimeout(r, 100));
  assert.ok(f.log.some((l) => l.includes("/generate/gen-1/cancel")));
  await stop(f);
});

test("servidor/túnel em baixo: «unreachable», sem lançar erros crus", async () => {
  __resetProfileCache();
  await assert.rejects(generateWav(cfg("http://127.0.0.1:1"), "x"), /Voicebox unreachable/);
});

test("a configuração aceita o perfil por nome ou id e o dialeto OpenAI antigo", () => {
  const native = voiceboxConfig({ VOICEBOX_URL: "https://v.exemplo.com", VOICEBOX_PROFILE: "OLYVER" })!;
  assert.deepEqual({ api: native.api, profile: native.profile, language: native.language, engine: native.engine, size: native.modelSize, timeout: native.timeoutMs }, { api: "native", profile: "OLYVER", language: "pt", engine: "qwen", size: "1.7B", timeout: 45000 });
  assert.equal(voiceboxConfig({ VOICEBOX_URL: "https://v.exemplo.com", VOICEBOX_API: "openai" })!.api, "openai");
  assert.equal(voiceboxConfig({ VOICEBOX_URL: "https://v.exemplo.com", VOICEBOX_VOICE: "Ana" })!.profile, "Ana");
});
