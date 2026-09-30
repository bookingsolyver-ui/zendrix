// Cria o bucket PRIVADO das mídias do WhatsApp no Supabase Storage (idempotente: se já existir,
// só o confirma). Corre-se uma vez:   node scripts/setup-storage.mjs
//
// Precisa de SUPABASE_SERVICE_ROLE_KEY no .env.local (Supabase → Project Settings → API →
// "service_role"). Essa chave ignora todas as regras de acesso: nunca a ponha em NEXT_PUBLIC_*
// nem no browser.
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";

if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing } = await supabase.storage.getBucket(bucket);
if (existing) {
  console.log(`O bucket "${bucket}" já existe (${existing.public ? "PÚBLICO — deve ser privado!" : "privado"}).`);
  if (existing.public) process.exitCode = 1;
  process.exit();
}

const { error } = await supabase.storage.createBucket(bucket, {
  public: false, // sem URLs públicos: o acesso é por URL assinado, gerado pelo servidor
  fileSizeLimit: 16 * 1024 * 1024, // o máximo do WhatsApp para áudio
  allowedMimeTypes: ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr", "audio/webm"],
});
if (error) {
  console.error("Não foi possível criar o bucket:", error.message);
  process.exit(1);
}
console.log(`Bucket privado "${bucket}" criado.`);
