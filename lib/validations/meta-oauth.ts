import "server-only";
import { z } from "zod";

// Entradas do fluxo OAuth da Meta. Tudo o que vem do browser (query) ou da Graph API é validado aqui.

export const OAUTH_PLATFORMS = ["instagram", "messenger"] as const;
export type OAuthPlatform = (typeof OAUTH_PLATFORMS)[number];

// GET /api/meta/oauth/start?platform=instagram&locale=pt
export const startQuerySchema = z.object({
  platform: z.enum(OAUTH_PLATFORMS),
  locale: z.string().max(8).optional(),
});

// GET /api/meta/oauth?code=...&state=... (ou ?error=access_denied... se o utilizador recusou)
export const callbackQuerySchema = z.object({
  code: z.string().min(1).max(2048).optional(),
  state: z.string().min(16).max(256).optional(),
  error: z.string().max(100).optional(),
});

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

// /me/accounts: as páginas a que o utilizador deu acesso, cada uma com o seu token e a conta de Instagram ligada.
export const pageSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  access_token: z.string().min(1),
  instagram_business_account: z
    .object({ id: z.string().min(1), username: z.string().optional() })
    .optional()
    .catch(undefined),
});
export type MetaPage = z.infer<typeof pageSchema>;

export const pagesResponseSchema = z.object({ data: z.array(z.unknown()) });

// Valida cada página à parte: uma entrada estranha não deita fora as restantes.
export function parsePages(json: unknown): MetaPage[] {
  const root = pagesResponseSchema.safeParse(json);
  if (!root.success) return [];
  return root.data.data.flatMap((raw) => {
    const page = pageSchema.safeParse(raw);
    return page.success ? [page.data] : [];
  });
}
