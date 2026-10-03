import "server-only";
import { Prisma } from "@prisma/client";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { MetaPage, OAuthPlatform } from "@/lib/validations/meta-oauth";

export interface SaveChannelsResult {
  connected: number;
  // Contas que já pertencem a OUTRA organização: nunca se transferem (cada conta tem um só dono, é o que
  // encaminha o webhook). Não se revela de quem são.
  conflicts: number;
}

// Guarda os canais descobertos no OAuth como SocialIntegration da organização, com o token CIFRADO.
//   Messenger: providerAccountId = id da página (é o entry.id dos webhooks)
//   Instagram: providerAccountId = id da conta profissional (entry.id) e pageId = a página ligada (para enviar)
// Reaplicar o OAuth atualiza o token (reconectar) em vez de duplicar.
export async function saveChannels(input: {
  workspaceId: string;
  platform: OAuthPlatform;
  pages: MetaPage[];
  // Quem autorizou no Facebook (para a eliminação de dados da Meta); null se não se conseguiu obter.
  metaUserId?: string | null;
}): Promise<SaveChannelsResult> {
  const { workspaceId, platform, pages, metaUserId = null } = input;
  const dbPlatform = platform === "instagram" ? "INSTAGRAM" : "MESSENGER";
  const result: SaveChannelsResult = { connected: 0, conflicts: 0 };

  for (const page of pages) {
    const accountId = platform === "instagram" ? page.instagram_business_account?.id : page.id;
    if (!accountId) continue; // página sem Instagram ligado

    const data = {
      accessToken: encryptSecret(page.access_token),
      pageId: page.id,
      status: "ACTIVE",
      metaUserId,
      tokenExpiresAt: null, // tokens de página obtidos de um token de longa duração não expiram
    };

    // Só atualiza se a conta for DESTA organização; senão tenta criar, e a unique recusa se for de outra.
    const updated = await prisma.socialIntegration.updateMany({
      where: { platform: dbPlatform, providerAccountId: accountId, workspaceId },
      data,
    });
    if (updated.count > 0) {
      result.connected++;
      continue;
    }
    try {
      await prisma.socialIntegration.create({
        data: { workspaceId, platform: dbPlatform, providerAccountId: accountId, ...data },
      });
      result.connected++;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        result.conflicts++;
      } else {
        throw err;
      }
    }
  }
  return result;
}
