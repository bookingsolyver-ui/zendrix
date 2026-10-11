import test from "node:test";
import assert from "node:assert/strict";
import { convertAudio } from "./transcode.ts";

// WAV PCM 16 bits mono: um tom de 440 Hz durante `seconds` (sem ficheiros, sem Voicebox).
function tone(seconds: number, rate = 24000): Buffer {
  const samples = Math.floor(seconds * rate);
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 12000), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8); header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

test("WAV -> Ogg/Opus mono (nota de voz do WhatsApp), muito mais pequeno", async () => {
  const wav = tone(2);
  const ogg = await convertAudio(wav, "opus");
  assert.equal(ogg.subarray(0, 4).toString("latin1"), "OggS");
  const head = ogg.subarray(0, 256).indexOf("OpusHead");
  assert.notEqual(head, -1);
  assert.equal(ogg[head + 9], 1, "tem de ser mono");
  assert.ok(ogg.length < wav.length / 4, `${ogg.length} vs ${wav.length}`);
});

test("WAV -> MP3 (recurso)", async () => {
  const mp3 = await convertAudio(tone(1), "mp3");
  assert.ok(mp3.length > 500);
  assert.ok(mp3[0] === 0xff || mp3.subarray(0, 3).toString("latin1") === "ID3");
});

test("áudio inválido ou vazio falha de forma limpa (nunca fica preso)", async () => {
  await assert.rejects(convertAudio(Buffer.from("isto não é áudio"), "opus"), /ffmpeg_failed/);
  await assert.rejects(convertAudio(Buffer.alloc(0), "opus"), /audio_empty/);
});
