import "server-only";
import { spawn } from "node:child_process";
import { accessSync, chmodSync, constants, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

// Conversão de áudio com o ffmpeg incluído na aplicação (@ffmpeg-installer/ffmpeg): funciona na Vercel, no canal da
// Meta e no do OpenWA (a imagem do OpenWA não traz ffmpeg). A Voicebox devolve WAV; o WhatsApp quer Ogg/Opus mono
// (nota de voz) ou, em último recurso, MP3. Tudo em memória, com timeout; nunca deixa um processo preso.

export type TargetFormat = "opus" | "mp3";

const TIMEOUT_MS = 20_000;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024; // o limite do WhatsApp para áudio

const ARGS: Record<TargetFormat, string[]> = {
  // 24 kHz mono, 32 kbit/s, perfil de voz: pequeno e claro. É o que o WhatsApp mostra como nota de voz.
  opus: ["-vn", "-ac", "1", "-ar", "24000", "-c:a", "libopus", "-b:a", "32k", "-application", "voip", "-f", "ogg"],
  mp3: ["-vn", "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", "-f", "mp3"],
};

let binary: string | null = null;

// Em alguns ambientes (ficheiros do pacote só de leitura) o binário perde a permissão de execução: copia-se para /tmp.
function ffmpegPath(): string {
  if (binary) return binary;
  const original = ffmpegInstaller.path;
  try {
    accessSync(original, constants.X_OK);
    return (binary = original);
  } catch {
    const copy = join(tmpdir(), "kf-ffmpeg");
    if (!existsSync(copy)) {
      copyFileSync(original, copy);
      chmodSync(copy, 0o755);
    }
    return (binary = copy);
  }
}

export function convertAudio(input: Buffer, to: TargetFormat): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (input.length === 0) return reject(new Error("audio_empty"));
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(ffmpegPath(), ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", ...ARGS[to], "pipe:1"], { stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      return reject(new Error("ffmpeg_unavailable"));
    }

    const out: Buffer[] = [];
    let outBytes = 0;
    let errTail = "";
    let settled = false;
    const finish = (error: Error | null, value?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        child.kill("SIGKILL");
        reject(error);
      } else resolve(value as Buffer);
    };
    const timer = setTimeout(() => finish(new Error("ffmpeg_timeout")), TIMEOUT_MS);

    child.stdout?.on("data", (chunk: Buffer) => {
      outBytes += chunk.length;
      if (outBytes > MAX_OUTPUT_BYTES) return finish(new Error("audio_too_large"));
      out.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      errTail = (errTail + chunk.toString("utf8")).slice(-300);
    });
    child.on("error", () => finish(new Error("ffmpeg_unavailable")));
    child.on("close", (code) => {
      if (code === 0 && outBytes > 0) finish(null, Buffer.concat(out));
      else finish(new Error(`ffmpeg_failed(${code}): ${errTail.replace(/\s+/g, " ").trim()}`));
    });
    // O ffmpeg pode fechar o stdin antes de ler tudo (áudio inválido): ignora-se o EPIPE, o "close" reporta o erro.
    child.stdin?.on("error", () => {});
    child.stdin?.end(input);
  });
}
