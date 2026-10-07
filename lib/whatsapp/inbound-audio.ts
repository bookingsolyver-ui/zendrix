import "server-only";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/lib/audio/transcribe";
import {
  mediaPathFor,
  storageConfigured,
  uploadMedia,
} from "@/lib/storage/media";
import { downloadMedia, getWhatsAppToken } from "@/lib/whatsapp/media";
import { loadTenant } from "@/lib/tenant";
import type { AgentEvent } from "@/lib/agent";

// Processa uma nota de voz recebida: descarrega da Meta, guarda o original no Storage e transcreve.
// Corre DEPOIS de a Meta receber o 200 (a mensagem já está gravada com o texto "Mensagem de voz").
// Desligado por defeito (AUDIO_INBOUND): enviar a voz de um cliente à OpenAI é uma decisão de
// privacidade, não um efeito secundário.

export const audioInboundEnabled = () => process.env.AUDIO_INBOUND === "true";

export interface AudioJob {
  workspaceId: string;
  conversationId: string;
  waMessageId: string;
  mediaId: string;
}

export const UNTRANSCRIBED_BODY =
  "Mensagem de voz (não foi possível transcrever)";

// Nunca lança. Devolve o evento para o agente, ou null se a funcionalidade está desligada.
// `unintelligible` = não conseguimos perceber o áudio: o agente pede ao cliente que escreva.
export async function processInboundAudio(
  job: AudioJob,
): Promise<AgentEvent | null> {
  const event = (unintelligible: boolean): AgentEvent => ({
    workspaceId: job.workspaceId,
    conversationId: job.conversationId,
    waMessageId: job.waMessageId,
    type: "audio",
    unintelligible,
  });

  // Desligado: nada sai do servidor (privacidade), mas o cliente não fica sem resposta à espera de um "olá":
  // o agente pede-lhe que escreva. (O agente só responde se a organização o tiver ligado.)
  if (!audioInboundEnabled()) return event(true);

  try {
    // Descarregar, guardar e transcrever custa dinheiro (e envia a voz do cliente a um terceiro): só para
    // organizações com a subscrição em dia. Nas outras a mensagem fica como "Mensagem de voz", sem áudio.
    const tenant = await loadTenant(job.workspaceId);
    if (!tenant?.subscriptionActive) return null;

    const token = await getWhatsAppToken(job.workspaceId);
    if (!token) {
      console.error(
        "[audio] sem token da Meta para o workspace",
        job.workspaceId,
      );
      return event(true);
    }

    const media = await downloadMedia(job.mediaId, token); // o URL da Meta só vale 5 minutos

    // Independentes: uma falha não deita abaixo a outra.
    const path = mediaPathFor(
      job.workspaceId,
      job.conversationId,
      job.waMessageId,
      media.mime,
    );
    const [stored, transcript] = await Promise.all([
      storageConfigured()
        ? uploadMedia(path, media.buffer, media.mime)
        : Promise.resolve(false),
      transcribeAudio(media.buffer, media.mime),
    ]);

    const message = await prisma.message.update({
      where: { waMessageId: job.waMessageId },
      data: {
        body: transcript ?? UNTRANSCRIBED_BODY,
        mediaPath: stored ? path : null,
      },
      select: { createdAt: true },
    });

    if (transcript) {
      // Só se esta ainda for a última mensagem da conversa (não pisar uma mais recente).
      await prisma.conversation.updateMany({
        where: { id: job.conversationId, lastMessageAt: message.createdAt },
        data: { lastMessagePreview: `🎤 ${transcript}`.slice(0, 120) },
      });
    }
    return event(transcript === null);
  } catch (err) {
    console.error("[audio] falhou:", err instanceof Error ? err.message : err);
    return event(true);
  }
}
