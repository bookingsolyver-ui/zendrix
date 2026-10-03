import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

// Descarregar a mídia que um cliente enviou (Media API da Meta), em dois passos:
//   1) GET /{media-id}  -> { url, mime_type, file_size, ... }   (o URL expira em 5 minutos)
//   2) GET {url} com o MESMO token no cabeçalho Authorization (sem ele o pedido falha)

export const MAX_MEDIA_BYTES = 16 * 1024 * 1024; // limite do WhatsApp para áudio

export type DownloadedMedia = { buffer: Buffer; mime: string };

// O token que a Meta vê é o do workspace (guardado cifrado), nunca uma variável global.
export async function getWhatsAppToken(workspaceId: string): Promise<string | null> {
  const integration = await prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { accessToken: true },
  });
  if (!integration) return null;
  try {
    return decryptSecret(integration.accessToken);
  } catch {
    return null;
  }
}

// O URL vem no corpo de uma resposta e o token vai-lhe atrás: só se segue se for mesmo da Meta.
const META_HOSTS = [".fbsbx.com", ".facebook.com", ".fbcdn.net", ".whatsapp.net", ".whatsapp.com"];

export function isMetaMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && META_HOSTS.some((suffix) => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export async function downloadMedia(mediaId: string, accessToken: string): Promise<DownloadedMedia> {
  const auth = { Authorization: `Bearer ${accessToken}` };

  const infoRes = await fetch(`https://graph.facebook.com/v17.0/${encodeURIComponent(mediaId)}`, {
    headers: auth,
    signal: AbortSignal.timeout(15_000),
  });
  const info = await infoRes.json().catch(() => null);
  if (!infoRes.ok || typeof info?.url !== "string") throw new Error(`media info ${infoRes.status}`);
  if (!isMetaMediaUrl(info.url)) throw new Error("media url is not a Meta host");
  if (typeof info.file_size === "number" && info.file_size > MAX_MEDIA_BYTES) throw new Error("media too large");

  const fileRes = await fetch(info.url, { headers: auth, signal: AbortSignal.timeout(30_000) });
  if (!fileRes.ok) throw new Error(`media download ${fileRes.status}`);
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) throw new Error("media size out of range");

  const mime = typeof info.mime_type === "string" ? info.mime_type : (fileRes.headers.get("content-type") ?? "audio/ogg");
  return { buffer, mime };
}
