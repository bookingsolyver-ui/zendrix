import { z } from "zod";

// Corpo (formulário) do callback da Meta: signed_request=<assinatura>.<payload>
export const metaDeletionFormSchema = z.object({ signed_request: z.string().min(10).max(4096) });

// Formulário público de pedido de eliminação.
export const deletionRequestSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email().max(254),
});

// O código de confirmação (12 caracteres base64url) que a página de estado aceita.
export const deletionCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{12}$/);

// Eliminar a conta: escrever ELIMINAR evita cliques acidentais.
export const deleteAccountSchema = z.strictObject({ confirm: z.literal("ELIMINAR") });
