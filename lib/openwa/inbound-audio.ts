import "server-only";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/lib/audio/transcribe";
import { mediaPathFor, storageConfigured, uploadMedia } from "@/lib/storage/media";
import { loadTenant } from "@/lib/tenant";
import { audioInboundEnabled, UNTRANSCRIBED_BODY } from "@/lib/whatsapp/inbound-audio";
import type { AgentEvent } from "@/lib/agent";
import { downloadMessageMedia } from "./client";
import { openWaConfig } from "./config";

// Nota de voz recebida pelo canal QR: descarrega o ficheiro do OpenWA, guarda o original no Storage, transcreve (Groq/OpenAI
// Whisper, os mesmos de sempre) e devolve o evento para o agente com o TEXTO transcrito. Corre depois de o webhook responder.
// Nunca lança. Se algo falhar, devolve o evento «ilegível» (o agente pede ao cliente que escreva).
//
// A transcrição envia a voz do cliente a um terceiro: só com AUDIO_INBOUND=true e subscrição em dia (como na API oficial).

export interface QrAudioJob {
  workspaceId: string;
  conversationId: string;
  sessionId: string;
  waId: string;
  waMessageId: string;
  mimeHint: string | null;
  inlineBase64: string | null;
}

export async function processQrAudio(job: QrAudioJob): Promise<AgentEvent | null> {
  const event = (unintelligible: boolean): AgentEvent => ({
    workspaceId: job.workspaceId,
    conversationId: job.conversationId,
    waMessageId: job.waMessageId,
    type: "audio",
    unintelligible,
  });

  if (!audioInboundEnabled()) return event(true); // privacidade: nada sai do servidor; o agente pede que escreva

  try {
    const tenant = await loadTenant(job.workspaceId);
    if (!tenant?.subscriptionActive) return null;

    // 1) os bytes: inline no webhook, ou descarregados do OpenWA
    let buffer: Buffer;
    let mime: string;
    if (job.inlineBase64) {
      buffer = Buffer.from(job.inlineBase64, "base64");
      mime = job.mimeHint ?? "audio/ogg";
    } else {
      const cfg = openWaConfig();
      if (!cfg) {
        console.error("[openwa/audio] OPENWA_URL/OPENWA_API_KEY em falta");
        return event(true);
      }
      const media = await downloadMessageMedia(cfg, job.sessionId, `${job.waId}@c.us`, job.waMessageId);
      buffer = media.buffer;
      mime = media.mime ?? job.mimeHint ?? "audio/ogg";
    }
    if (buffer.length === 0) return event(true);

    // 2) guardar o original e transcrever (independentes: uma falha não deita abaixo a outra)
    const path = mediaPathFor(job.workspaceId, job.conversationId, job.waMessageId, mime);
    const [stored, transcript] = await Promise.all([
      storageConfigured() ? uploadMedia(path, buffer, mime) : Promise.resolve(false),
      transcribeAudio(buffer, mime),
    ]);

    // 3) a mensagem passa a mostrar o texto (e o agente lê-o)
    const message = await prisma.message.update({
      where: { waMessageId: job.waMessageId },
      data: { body: transcript ?? UNTRANSCRIBED_BODY, mediaPath: stored ? path : null },
      select: { createdAt: true },
    });
    if (transcript) {
      await prisma.conversation.updateMany({
        where: { id: job.conversationId, lastMessageAt: message.createdAt },
        data: { lastMessagePreview: `🎤 ${transcript}`.slice(0, 120) },
      });
    }
    return event(transcript === null);
  } catch (err) {
    console.error("[openwa/audio] falhou:", err instanceof Error ? err.message : err);
    return event(true);
  }
}
