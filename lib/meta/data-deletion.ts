import "server-only";
import { newDeletionCode } from "@/lib/account/delete";
import { decryptSecret } from "@/lib/crypto";
import { unsubscribePage } from "@/lib/meta/oauth";
import { prisma } from "@/lib/prisma";

// Pedido de eliminação de dados da Meta (callback): a pessoa removeu a app nas definições do Facebook. Apaga-se
// o que ELA ligou (SocialIntegration.metaUserId): tokens e ligações aos canais. As conversas pertencem à
// organização do cliente (a empresa é a responsável por esses dados) e mantêm-se; o utilizador apaga a conta
// em Configurações se quiser tudo fora. Idempotente: a Meta pode repetir o pedido.
export async function eraseMetaUserData(metaUserId: string): Promise<{ code: string; integrations: number }> {
  const rows = await prisma.socialIntegration.findMany({
    where: { metaUserId },
    select: { id: true, platform: true, pageId: true, accessToken: true },
  });

  const deleted = await prisma.socialIntegration.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });

  // Deixa de receber os eventos das páginas, se nenhuma outra ligação as usa. Best-effort.
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.platform === "WHATSAPP" || !row.pageId || seen.has(row.pageId)) continue;
    seen.add(row.pageId);
    if ((await prisma.socialIntegration.count({ where: { pageId: row.pageId } })) > 0) continue;
    try {
      await unsubscribePage(row.pageId, decryptSecret(row.accessToken));
    } catch {
      // token ilegível: nada a fazer na Meta
    }
  }

  const code = newDeletionCode();
  await prisma.dataDeletionRequest.create({
    data: {
      code,
      source: "meta_callback",
      metaUserId,
      status: "completed",
      completedAt: new Date(),
      detail: deleted.count === 0 ? "nenhuma ligação associada a este utilizador" : `${deleted.count} ligação(ões) a canais removida(s)`,
    },
  });
  return { code, integrations: deleted.count };
}
