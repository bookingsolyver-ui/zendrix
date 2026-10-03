// Validação dos modelos de mensagem. Puro (sem servidor).
import { z } from "zod";

export const TEMPLATE_CATEGORIES = ["UTILITY", "MARKETING"] as const;
export const TEMPLATE_CATEGORY_LABEL: Record<(typeof TEMPLATE_CATEGORIES)[number], string> = {
  UTILITY: "Utilidade",
  MARKETING: "Marketing",
};
export const TEMPLATE_LANGUAGES = [
  { value: "pt_PT", label: "Português (Portugal)" },
  { value: "pt_BR", label: "Português (Brasil)" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
] as const;

// O nome segue a regra da Meta: minúsculas, números e sublinhado.
export const templateInputSchema = z.object({
  name: z.string().trim().min(1).max(60).regex(/^[a-z0-9_]+$/),
  category: z.enum(TEMPLATE_CATEGORIES),
  language: z.enum(["pt_PT", "pt_BR", "en", "es"]),
  body: z.string().trim().min(1).max(1024),
});
export const MAX_TEMPLATES = 100;

// As variáveis {{1}}, {{2}}... usadas no texto, por ordem e sem repetições.
export function templateVariables(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\d{1,2})\}\}/g)].map((match) => match[1]))].sort((a, b) => Number(a) - Number(b));
}
