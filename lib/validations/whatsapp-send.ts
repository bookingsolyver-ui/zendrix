import { z } from "zod";

export const MAX_TEXT_LENGTH = 4096;

// POST /api/whatsapp/send: texto livre numa conversa existente.
export const sendTextSchema = z.object({
  conversationId: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
});
