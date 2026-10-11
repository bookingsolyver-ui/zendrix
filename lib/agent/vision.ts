import "server-only";
import { runAgentSafely } from "@/lib/agent";
import { drainOutbox } from "@/lib/outbox/process";
import { prisma } from "@/lib/prisma";
import {
  mediaPathFor,
  storageConfigured,
  uploadMedia,
} from "@/lib/storage/media";
import { toDataUrl, visionEligible } from "./vision-format";

// Imagem ou documento que NÃO é um comprovativo (o comprovativo tem o seu caminho em lib/payments/proofs.ts):
//   1. guarda o ficheiro e liga-o à mensagem (message.mediaPath, já existente), para a equipa o ver na Inbox;
//   2. corre o agente, com a imagem anexada ao pedido quando o modelo a consegue ver.
// Nunca lança. Não altera o schema: reutiliza mediaPath.
export async function handleVisualMessage(job: {
  workspaceId: string;
  conversationId: string;
  waMessageId: string;
  type: string;
  getMedia: () => Promise<{ buffer: Buffer; mime: string } | null>;
}): Promise<void> {
  let imageDataUrl: string | undefined;
  try {
    const media = await job.getMedia();
    if (media && media.buffer.length > 0) {
      if (storageConfigured()) {
        const path = mediaPathFor(
          job.workspaceId,
          job.conversationId,
          job.waMessageId,
          media.mime,
        );
        if (await uploadMedia(path, media.buffer, media.mime)) {
          await prisma.message.updateMany({
            where: {
              waMessageId: job.waMessageId,
              workspaceId: job.workspaceId,
            },
            data: { mediaPath: path },
          });
        }
      }
      if (
        job.type === "image" &&
        visionEligible(media.mime, media.buffer.length)
      ) {
        imageDataUrl = toDataUrl(media.mime, media.buffer);
      }
    }
  } catch (err) {
    // Sem o ficheiro o agente responde na mesma (só com a anotação "o cliente enviou uma imagem").
    console.error(
      "[agent/vision] não foi possível obter ou guardar o ficheiro:",
      err instanceof Error ? err.message : "unknown",
    );
  }

  await runAgentSafely([
    {
      workspaceId: job.workspaceId,
      conversationId: job.conversationId,
      waMessageId: job.waMessageId,
      type: job.type,
      visual: true,
      ...(imageDataUrl ? { imageDataUrl } : {}),
    },
  ]);
  await drainOutbox(60_000);
}
