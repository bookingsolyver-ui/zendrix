// Transcreve as notas de voz que ficaram por transcrever (por exemplo, porque a conta da OpenAI
// estava sem crédito). O original está no Storage privado, por isso não se perde nada.
//
//   node scripts/retranscribe-audio.mjs --dry   só lista o que há por transcrever
//   node scripts/retranscribe-audio.mjs         transcreve e atualiza as mensagens
//
// NÃO responde aos clientes: só atualiza o texto que a equipa vê na Inbox.
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { transcribeAudio } from "../lib/audio/transcribe.ts";

process.loadEnvFile(".env.local");

const dry = process.argv.includes("--dry");
const bucket = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";
const PENDING = "Mensagem de voz (não foi possível transcrever)";

const db = new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
await db.connect();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const { rows } = await db.query(
    `select id, "conversationId", media_path, "createdAt" from "Message"
     where direction = 'IN' and type = 'audio' and body = $1 and media_path is not null
     order by "createdAt"`,
    [PENDING]
  );
  console.log(`${rows.length} nota(s) de voz por transcrever.`);
  if (dry || rows.length === 0) process.exit(0);

  let done = 0;
  for (const row of rows) {
    const { data, error } = await supabase.storage.from(bucket).download(row.media_path);
    if (error || !data) {
      console.error(`  ✗ ${row.id}: não foi possível ler o ficheiro (${error?.message})`);
      continue;
    }
    const text = await transcribeAudio(Buffer.from(await data.arrayBuffer()), data.type || "audio/ogg");
    if (!text) {
      console.error(`  ✗ ${row.id}: sem transcrição (veja o motivo acima)`);
      continue;
    }
    await db.query(`update "Message" set body = $1 where id = $2`, [text, row.id]);
    // Só atualiza a pré-visualização se esta ainda for a última mensagem da conversa.
    await db.query(
      `update "Conversation" set "lastMessagePreview" = left($1, 120) where id = $2 and "lastMessageAt" = $3`,
      [`🎤 ${text}`, row.conversationId, row.createdAt]
    );
    done += 1;
    console.log(`  ✓ ${row.id}: "${text.slice(0, 70)}${text.length > 70 ? "…" : ""}"`);
  }
  console.log(`${done} de ${rows.length} transcrita(s).`);
} finally {
  await db.end();
}
