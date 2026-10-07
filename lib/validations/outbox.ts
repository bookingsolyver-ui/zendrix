import "server-only";
import { z } from "zod";

// O que vai na coluna `payload` de OutboxMessage. Validado ao entrar (enqueue) e ao sair (worker): uma linha
// corrompida ou escrita à mão falha com um erro claro em vez de enviar lixo à Meta.
const common = {
  to: z.string().min(1).max(64), // id do destinatário na plataforma (número, IGSID ou PSID)
  conversationId: z.string().min(1),
  messageId: z.string().min(1), // a linha de Message que mostra esta mensagem na Inbox
};
const textPayload = z.object({ kind: z.literal("text"), text: z.string().min(1).max(4096), ...common });
// Modelo aprovado da Meta (WhatsApp): vale fora da janela de 24 h.
const templatePayload = z.object({
  kind: z.literal("template"),
  templateName: z.string().min(1).max(512),
  language: z.string().min(2).max(16),
  params: z.array(z.string().min(1).max(200)).max(20),
  ...common,
});
export const outboxPayloadSchema = z.discriminatedUnion("kind", [textPayload, templatePayload]);
export type OutboxPayload = z.infer<typeof outboxPayloadSchema>;
