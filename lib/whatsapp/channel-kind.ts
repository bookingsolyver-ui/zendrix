import "server-only";
import { prisma } from "@/lib/prisma";
import { QR_PREFIX } from "@/lib/openwa/config";

// Que canal de WhatsApp está ATIVO nesta organização: a API oficial da Meta ("meta") ou o QR Code/OpenWA ("qr").
// É a mesma escolha que o envio faz (a ligação ativa mais recente), por isso a Inbox, o seletor de templates e a
// fila nunca discordam. null = nenhum canal de WhatsApp ligado.
export type WhatsAppKind = "meta" | "qr";

export async function activeWhatsAppKind(workspaceId: string): Promise<WhatsAppKind | null> {
  const integration = await prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE", providerAccountId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { providerAccountId: true },
  });
  if (!integration?.providerAccountId) return null;
  return integration.providerAccountId.startsWith(QR_PREFIX) ? "qr" : "meta";
}
