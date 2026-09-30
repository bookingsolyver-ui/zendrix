import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for secrets stored in the database (OAuth/API tokens of connected accounts).
// Stored format: "v1:<iv>:<authTag>:<ciphertext>", each part base64.
// The key lives only in the server environment (INTEGRATION_ENCRYPTION_KEY, 32 bytes, base64).
// Losing or changing the key makes every stored token unrecoverable — back it up.

const VERSION = "v1";

function getKey() {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw) throw new Error("INTEGRATION_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  }
  return key;
}

export function isEncryptedSecret(value: string) {
  return value.startsWith(`${VERSION}:`) && value.split(":").length === 4;
}

export function encryptSecret(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptSecret(payload: string) {
  if (!isEncryptedSecret(payload)) throw new Error("Unsupported secret format");
  const [, iv, authTag, encrypted] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
