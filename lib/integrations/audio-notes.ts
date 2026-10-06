import "server-only";
import { prisma } from "@/lib/prisma";
import { UNTRANSCRIBED_BODY } from "@/lib/whatsapp/inbound-audio";

// WhatsApp Audio-to-CRM. O webhook da Meta (lib/meta/handler.ts) JÁ recebe as notas de voz, descarrega-as e transcreve-as
// com o Whisper (lib/audio/transcribe.ts, ligado por AUDIO_INBOUND=true), e grava o texto na mensagem. Só faltava o
// passo final: transformar essa transcrição numa NOTA no perfil do cliente. Em vez de mexer no handler (e de pôr um
// segundo webhook, que a Meta não permite: há um só URL por app), este varrimento converte as transcrições novas.
//
// Idempotente: cada nota tem a chave única `wa:<id da mensagem>`; varrer duas vezes (ou dois workers) nunca duplica.

const WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // só transcrições recentes: o cron corre de 5 em 5 min
const BATCH = 200;

const timeFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });

export async function syncAudioNotes(now = new Date()): Promise<{ scanned: number; created: number }> {
  const messages = await prisma.message.findMany({
    where: {
      direction: "IN",
      type: "audio",
      createdAt: { gt: new Date(now.getTime() - WINDOW_MS) },
      waMessageId: { not: null },
      NOT: [{ body: UNTRANSCRIBED_BODY }, { body: "Mensagem de voz" }], // ainda sem transcrição (ou não foi possível)
      workspace: { approvalStatus: "APPROVED", blockedAt: null },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { workspaceId: true, waMessageId: true, body: true, createdAt: true, conversation: { select: { contactId: true } } },
  });
  if (!messages.length) return { scanned: 0, created: 0 };

  const result = await prisma.contactNote.createMany({
    data: messages.map((m) => ({
      workspaceId: m.workspaceId,
      contactId: m.conversation.contactId,
      source: "whatsapp_audio",
      sourceKey: `wa:${m.waMessageId}`,
      body: `Nota de voz (${timeFormat.format(m.createdAt)}): ${m.body}`.slice(0, 4000),
    })),
    skipDuplicates: true,
  });
  return { scanned: messages.length, created: result.count };
}
