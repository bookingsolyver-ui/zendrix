import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Ficheiros de mídia dos clientes no Supabase Storage.
// O bucket é PRIVADO: uma nota de voz é um dado pessoal e um URL público ficava aberto a quem o tivesse.
// A base de dados guarda só o CAMINHO do objeto; quem vê a Inbox recebe um URL assinado de curta duração.
// A chave "service role" ignora as regras de acesso do Supabase: só existe no servidor.

export const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const REUSE_MARGIN_SECONDS = 10 * 60;

export const storageConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const globalForStorage = globalThis as unknown as { storageAdmin?: SupabaseClient };

function admin(): SupabaseClient | null {
  if (!storageConfigured()) return null;
  return (globalForStorage.storageAdmin ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  ));
}

const EXTENSIONS: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "audio/webm": "webm",
};

// workspace/conversa/mensagem.ext — o prefixo do workspace é o que isola um cliente do outro.
export function mediaPathFor(workspaceId: string, conversationId: string, waMessageId: string, mime: string) {
  const ext = EXTENSIONS[mime.split(";")[0].trim().toLowerCase()] ?? "bin";
  const safeId = waMessageId.replace(/[^A-Za-z0-9._-]/g, "_");
  return `${workspaceId}/${conversationId}/${safeId}.${ext}`;
}

export async function uploadMedia(path: string, buffer: Buffer, mime: string): Promise<boolean> {
  const client = admin();
  if (!client) return false;
  const { error } = await client.storage
    .from(MEDIA_BUCKET)
    .upload(path, buffer, { contentType: mime.split(";")[0].trim() || "application/octet-stream", upsert: true });
  if (error) {
    console.error("[storage] upload falhou:", error.message);
    return false;
  }
  return true;
}

// O mesmo URL enquanto for válido: a Inbox atualiza a cada poucos segundos e, se o URL mudasse a
// cada pedido, o leitor de áudio reiniciava a meio da reprodução.
const cache = new Map<string, { url: string; expiresAt: number }>();

export async function signedMediaUrls(workspaceId: string, paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const client = admin();
  if (!client || paths.length === 0) return result;

  const now = Date.now();
  const missing: string[] = [];
  for (const path of paths) {
    // Defesa em profundidade: só se assina o que pertence a este workspace.
    if (!path.startsWith(`${workspaceId}/`)) continue;
    const hit = cache.get(path);
    if (hit && hit.expiresAt > now) result[path] = hit.url;
    else missing.push(path);
  }
  if (missing.length === 0) return result;

  const { data, error } = await client.storage.from(MEDIA_BUCKET).createSignedUrls(missing, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("[storage] assinar URLs falhou:", error?.message);
    return result;
  }
  for (const item of data) {
    if (!item.path || !item.signedUrl) continue;
    cache.set(item.path, {
      url: item.signedUrl,
      expiresAt: now + (SIGNED_URL_TTL_SECONDS - REUSE_MARGIN_SECONDS) * 1000,
    });
    result[item.path] = item.signedUrl;
  }
  return result;
}
