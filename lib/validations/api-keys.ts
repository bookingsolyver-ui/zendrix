import { z } from "zod";

// Pedido para criar uma chave de API. O papel OWNER nunca é permitido numa chave.
export const createApiKeySchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["MANAGER", "STAFF"]).default("STAFF"),
  expiresInDays: z.number().int().min(1).max(730).optional(),
});

export const apiKeyIdSchema = z.string().min(1).max(64);
