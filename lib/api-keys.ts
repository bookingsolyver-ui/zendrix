import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Formato e hash das chaves de API. Puro (sem base de dados): testável e reutilizável.
//
//   zxk_<prefixo 8>_<segredo 43>      ex.: zxk_a1B2c3D4_<43 caracteres base64url>
//
// O segredo tem 256 bits aleatórios, por isso basta um SHA-256 (não é uma palavra-passe de humano:
// não há dicionários a atacar, e o hash determinístico permite procurar a chave por índice).

export const API_KEY_HEADER = "x-api-key";
const KEY_PATTERN = /^zxk_[A-Za-z0-9_-]{8}_[A-Za-z0-9_-]{43}$/;

export interface GeneratedApiKey {
  key: string; // mostrada uma única vez
  prefix: string; // "zxk_a1B2c3D4": guardado em claro para identificar a chave numa lista
  hash: string;
}

export const hashApiKey = (key: string) => createHash("sha256").update(key, "utf8").digest("hex");

export function generateApiKey(): GeneratedApiKey {
  const id = randomBytes(6).toString("base64url").slice(0, 8);
  const secret = randomBytes(32).toString("base64url"); // 43 caracteres
  const key = `zxk_${id}_${secret}`;
  return { key, prefix: `zxk_${id}`, hash: hashApiKey(key) };
}

// Rejeita à partida o que nem tem a forma de uma chave nossa (poupa uma ida à base de dados).
export const looksLikeApiKey = (value: string) => KEY_PATTERN.test(value);
