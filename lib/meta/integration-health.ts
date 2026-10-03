import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Saúde das ligações à Meta. Um token que a Meta recusa (erro 190: expirado, revogado, palavra-passe mudada)
// não se resolve sozinho: marca-se a integração como TOKEN_EXPIRED. A partir daí:
//  * os envios falham logo, com "no_integration" (em vez de cada resposta da IA ir à Meta para falhar);
//  * os eventos que a Meta nos ENVIA continuam a ser recebidos (não precisam do token), por isso nada se perde;
//  * o painel mostra um aviso a pedir para voltar a ligar o canal; ligar de novo (OAuth ou novo token) reativa-a.
export const TOKEN_EXPIRED = "TOKEN_EXPIRED";
// Estados em que a integração ainda existe e recebe eventos.
export const LINKED_STATUSES = ["ACTIVE", TOKEN_EXPIRED];

export async function markIntegrationExpired(integrationId: string) {
  const { count } = await prisma.socialIntegration.updateMany({
    where: { id: integrationId, status: "ACTIVE" },
    data: { status: TOKEN_EXPIRED },
  });
  if (count > 0) console.warn(`[meta] a Meta recusou o token da integração ${integrationId}; marcada como TOKEN_EXPIRED`);
}

export interface ExpiredChannel {
  platform: "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
  count: number;
}

// Canais da organização com o token recusado. Em cache por pedido (o layout e a página podem pedir os dois).
export const getExpiredChannels = cache(async (workspaceId: string): Promise<ExpiredChannel[]> => {
  const rows = await prisma.socialIntegration.groupBy({
    by: ["platform"],
    where: { workspaceId, status: TOKEN_EXPIRED },
    _count: { _all: true },
  });
  return rows.map((row) => ({ platform: row.platform as ExpiredChannel["platform"], count: row._count._all }));
});
