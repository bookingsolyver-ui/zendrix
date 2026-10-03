import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// O `signed_request` que a Meta envia ao callback de eliminação de dados: "<assinatura>.<payload>", ambos em
// base64url. A assinatura é HMAC-SHA256 do payload (a parte em base64url, tal como veio) com o segredo da app.
// Sem verificar isto, qualquer pessoa podia mandar apagar as ligações de outro utilizador com um POST.

const payloadSchema = z.object({
  algorithm: z.string(),
  user_id: z.string().min(1).max(64),
});

export function parseSignedRequest(signedRequest: string, appSecret: string): { userId: string } | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [encodedSignature, encodedPayload] = parts;

  const received = Buffer.from(encodedSignature, "base64url");
  const expected = createHmac("sha256", appSecret).update(encodedPayload).digest();
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const payload = payloadSchema.safeParse(json);
  // A Meta assina sempre com HMAC-SHA256: outro algoritmo declarado é uma tentativa de enganar a verificação.
  if (!payload.success || payload.data.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
  return { userId: payload.data.user_id };
}
