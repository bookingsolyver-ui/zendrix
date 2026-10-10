import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Tokens do Kwanza Flow Portal. 256 bits aleatórios (não adivinháveis); na base de dados só fica o SHA-256 (como as chaves de
// API e os convites): quem lesse a tabela não conseguia abrir nenhum link. Hash e não cifra: o servidor nunca precisa de
// recuperar o token, só de reconhecê-lo.
export const PORTAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const generatePortalToken = () => randomBytes(32).toString("base64url");
export const hashPortalToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const looksLikePortalToken = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
