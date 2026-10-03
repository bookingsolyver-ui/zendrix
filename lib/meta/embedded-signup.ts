import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCode, graphBase, MetaOAuthError, type MetaOAuthConfig } from "@/lib/meta/oauth";
import { prisma } from "@/lib/prisma";

// WhatsApp Embedded Signup: o cliente liga o SEU número num popup da Meta, sem copiar tokens. O browser traz-nos
// o `code` (FB.login) e os ids que o popup anunciou. Os ids vêm do browser, por isso NÃO se confia neles:
// confirma-se na Graph API, com o token que o próprio cliente autorizou, que esse número e essa conta lhe pertencem.

export type EmbeddedSignupError =
  | "invalid_code" // o code não troca por um token
  | "not_your_number" // o token não vê esse número: ids falsos ou de outra pessoa
  | "waba_mismatch" // o número não pertence a essa conta WhatsApp Business
  | "conflict" // o número já está ligado a OUTRA organização
  | "meta_error";

export type EmbeddedSignupResult =
  | { ok: true; displayPhoneNumber: string | null; verifiedName: string | null; subscribed: boolean }
  | { ok: false; error: EmbeddedSignupError };

const TIMEOUT_MS = 15_000;

async function graphGet(path: string, token: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${graphBase()}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function graphPostJson(path: string, token: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${graphBase()}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const phoneSchema = z.object({
  id: z.string(),
  display_phone_number: z.string().optional(),
  verified_name: z.string().optional(),
});
const phoneListSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

export async function connectWhatsAppEmbedded(input: {
  config: MetaOAuthConfig;
  workspaceId: string;
  code: string;
  wabaId: string;
  phoneNumberId: string;
}): Promise<EmbeddedSignupResult> {
  const { config, workspaceId, code, wabaId, phoneNumberId } = input;

  // 1) code -> token de negócio (não expira, enquanto o cliente não revogar o acesso)
  let token: string;
  try {
    token = await exchangeCode(config, code);
  } catch (err) {
    if (err instanceof MetaOAuthError && err.status >= 500) return { ok: false, error: "meta_error" };
    return { ok: false, error: "invalid_code" };
  }

  // 2) o token vê este número? Com ids falsos (ou de outra pessoa) a Meta responde 4xx.
  let phone: z.infer<typeof phoneSchema>;
  try {
    const { status, json } = await graphGet(`${phoneNumberId}?fields=id,display_phone_number,verified_name`, token);
    const parsed = phoneSchema.safeParse(json);
    if (status >= 500) return { ok: false, error: "meta_error" };
    if (status !== 200 || !parsed.success || parsed.data.id !== phoneNumberId) return { ok: false, error: "not_your_number" };
    phone = parsed.data;
  } catch {
    return { ok: false, error: "meta_error" };
  }

  // 3) e esse número pertence mesmo a essa conta WhatsApp Business?
  try {
    const { status, json } = await graphGet(`${wabaId}/phone_numbers?fields=id&limit=100`, token);
    const list = phoneListSchema.safeParse(json);
    if (status >= 500) return { ok: false, error: "meta_error" };
    if (status !== 200 || !list.success || !list.data.data.some((entry) => entry.id === phoneNumberId)) {
      return { ok: false, error: "waba_mismatch" };
    }
  } catch {
    return { ok: false, error: "meta_error" };
  }

  // 4) a Meta passa a enviar-nos as mensagens desta conta; e regista-se o número na Cloud API (um PIN aleatório
  //    de verificação em dois passos). O registo falha se o número já estava registado: não é um erro.
  const subscribed = await graphPostJson(`${wabaId}/subscribed_apps`, token, {});
  await graphPostJson(`${phoneNumberId}/register`, token, {
    messaging_product: "whatsapp",
    pin: String(randomInt(100000, 1000000)),
  });

  // 5) guardar, com o token cifrado. Um número só pode pertencer a uma organização.
  const data = {
    accessToken: encryptSecret(token),
    wabaId,
    status: "ACTIVE",
    tokenExpiresAt: null,
  };
  const updated = await prisma.socialIntegration.updateMany({
    where: { platform: "WHATSAPP", providerAccountId: phoneNumberId, workspaceId },
    data,
  });
  if (updated.count === 0) {
    try {
      await prisma.socialIntegration.create({
        data: { workspaceId, platform: "WHATSAPP", providerAccountId: phoneNumberId, ...data },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { ok: false, error: "conflict" };
      throw err;
    }
  }

  return { ok: true, displayPhoneNumber: phone.display_phone_number ?? null, verifiedName: phone.verified_name ?? null, subscribed };
}
