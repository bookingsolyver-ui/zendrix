import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Ficheiros de mídia dos clientes no Supabase Storage.
// O bucket é PRIVADO: uma nota de voz é um dado pessoal e um URL público ficava aberto a quem o tivesse.
// A base de dados guarda só o CAMINHO do objeto; quem vê a Inbox recebe um URL assinado de curta duração.
// A chave "service role" ignora as regras de acesso do Supabase: só existe no servidor.

export const MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

// Os URLs são assinados no momento, a cada pedido: não há cache. Uma cache em memória não é partilhada
// entre instâncias serverless (cada uma assinava à mesma), e assinar é uma chamada barata ao Storage.
export async function signedMediaUrls(workspaceId: string, paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const client = admin();
  if (!client || paths.length === 0) return result;

  // Defesa em profundidade: só se assina o que pertence a este workspace.
  const own = paths.filter((path) => path.startsWith(`${workspaceId}/`));
  if (own.length === 0) return result;

  const { data, error } = await client.storage.from(MEDIA_BUCKET).createSignedUrls(own, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error("[storage] assinar URLs falhou:", error?.message);
    return result;
  }
  for (const item of data) {
    if (item.path && item.signedUrl) result[item.path] = item.signedUrl;
  }
  return result;
}

// Apaga TODOS os ficheiros de uma organização (notas de voz dos clientes), ao eliminar a conta. A estrutura é
// <organização>/<conversa>/<ficheiro>. Devolve quantos apagou; nunca lança (falhas ficam no log).
export async function deleteWorkspaceMedia(workspaceId: string): Promise<number> {
  const client = admin();
  if (!client) return 0;
  const bucket = client.storage.from(MEDIA_BUCKET);
  let removed = 0;
  try {
    const { data: folders } = await bucket.list(workspaceId, { limit: 1000 });
    for (const folder of folders ?? []) {
      const { data: files } = await bucket.list(`${workspaceId}/${folder.name}`, { limit: 1000 });
      const paths = (files ?? []).map((file) => `${workspaceId}/${folder.name}/${file.name}`);
      if (paths.length === 0) continue;
      const { error } = await bucket.remove(paths);
      if (error) console.error("[storage] apagar ficheiros falhou:", error.message);
      else removed += paths.length;
    }
  } catch (err) {
    console.error("[storage] apagar ficheiros da organização falhou:", err instanceof Error ? err.name : "unknown");
  }
  return removed;
}
