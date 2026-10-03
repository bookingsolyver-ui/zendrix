import "server-only";
import { createHash, randomBytes } from "node:crypto";

// O token de um convite: 256 bits aleatórios, só existe no link enviado ao convidado. Na base de dados fica o
// hash SHA-256 (alta entropia: basta, e permite procurar por índice), tal como as chaves de API.
export const INVITE_TTL_DAYS = 7;

export const hashInviteToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export function generateInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

// Só aceita o que tem a forma de um token nosso: poupa uma ida à base de dados com lixo.
export const looksLikeInviteToken = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);
