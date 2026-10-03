import "server-only";
import { z } from "zod";

// O que vai na coluna `payload` de OutboxMessage. Validado ao entrar (enqueue) e ao sair (worker): uma linha
// corrompida ou escrita à mão falha com um erro claro em vez de enviar lixo à Meta.
export const outboxPayloadSchema = z.object({
  kind: z.literal("text"),
  to: z.string().min(1).max(64), // id do destinatário na plataforma (número, IGSID ou PSID)
  text: z.string().min(1).max(4096),
  conversationId: z.string().min(1),
  messageId: z.string().min(1), // a linha de Message que mostra esta mensagem na Inbox
});
export type OutboxPayload = z.infer<typeof outboxPayloadSchema>;
