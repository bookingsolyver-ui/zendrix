import "server-only";
import { attachmentPath, categoryFor } from "./attachment-path";
import { storageConfigured, uploadMedia } from "./media";

// Guarda um anexo de um cliente na «pasta» certa do Storage (bucket privado, prefixo do tenant), com um nome limpo
// (<cliente>_<timestamp>_<id>.<ext>). Nunca lança. `storagePath` é o que vai para message.mediaPath (sem migração):
// a Inbox converte-o num URL assinado de curta duração a cada pedido (o bucket é privado; um URL guardado expiraria).
export async function saveAttachment(input: {
  workspaceId: string;
  // Comprovativo de pagamento (capturado depois de enviarmos os dados bancários) ou anexo geral.
  isPaymentProof: boolean;
  customerName: string | null | undefined;
  at: Date;
  waMessageId: string;
  media: { buffer: Buffer; mime: string };
}): Promise<{ storagePath: string | null; category: string }> {
  const category = categoryFor(input.isPaymentProof);
  const path = attachmentPath({
    workspaceId: input.workspaceId,
    category,
    customerName: input.customerName,
    at: input.at,
    waMessageId: input.waMessageId,
    mime: input.media.mime,
  });
  const stored = storageConfigured()
    ? await uploadMedia(path, input.media.buffer, input.media.mime)
    : false;
  return { storagePath: stored ? path : null, category };
}
