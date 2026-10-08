import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpeechRequest, parseBaseUrl, voiceboxConfig } from "./config.ts";

test("parseBaseUrl: só https (ou http local) e sem barra final", () => {
  assert.equal(parseBaseUrl("https://voz.exemplo.com/"), "https://voz.exemplo.com");
  assert.equal(parseBaseUrl("http://127.0.0.1:17493"), "http://127.0.0.1:17493");
  assert.equal(parseBaseUrl("http://voz.exemplo.com"), null);
  assert.equal(parseBaseUrl("não é um url"), null);
  assert.equal(parseBaseUrl(""), null);
  assert.equal(parseBaseUrl(undefined), null);
});

test("voiceboxConfig: sem URL não há Voicebox; valores por defeito e limites", () => {
  assert.equal(voiceboxConfig({}), null);
  const config = voiceboxConfig({ VOICEBOX_URL: "https://v.x", VOICEBOX_SPEED: "9" });
  assert.equal(config?.model, "tts-1");
  assert.equal(config?.speed, null);
  assert.equal(config?.apiKey, null);
});

test("buildSpeechRequest: rota OpenAI-compatível, chave em Bearer e voz opcional", () => {
  const config = voiceboxConfig({ VOICEBOX_URL: "https://v.x", VOICEBOX_API_KEY: " k ", VOICEBOX_VOICE: "Ana", VOICEBOX_SPEED: "1.1" })!;
  const request = buildSpeechRequest(config, "Olá", "opus");
  assert.equal(request.url, "https://v.x/v1/audio/speech");
  assert.equal(request.headers.Authorization, "Bearer k");
  assert.deepEqual(JSON.parse(request.body), { model: "tts-1", input: "Olá", response_format: "opus", voice: "Ana", speed: 1.1 });
  const bare = buildSpeechRequest(voiceboxConfig({ VOICEBOX_URL: "https://v.x" })!, "Olá", "mp3");
  assert.equal(bare.headers.Authorization, undefined);
  assert.equal(JSON.parse(bare.body).voice, undefined);
});
