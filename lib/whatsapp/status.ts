import "server-only";
import { prisma } from "@/lib/prisma";
import { LINKED_STATUSES, TOKEN_EXPIRED } from "@/lib/meta/integration-health";

export interface WhatsAppStatus {
  // Há PELO MENOS UM canal ligado (WhatsApp, Instagram ou Messenger): é o que decide mostrar a Inbox. O nome
  // vem de quando só havia WhatsApp; sem isto, quem só tem Instagram ou Messenger via "ligue o WhatsApp".
  connected: boolean;
  // Números de WhatsApp ligados (incluindo os de token expirado: ainda há que lhes dar um token novo).
  count: number;
  // Algum canal com o token recusado pela Meta.
  expired: boolean;
  // Phone number ID of the newest active WhatsApp integration. Never includes the access token.
  phoneId: string | null;
}

const NOT_CONNECTED: WhatsAppStatus = { connected: false, count: 0, expired: false, phoneId: null };

// Real connection state, read from the workspace's SocialIntegration rows.
export async function getWhatsAppStatus(workspaceId: string | undefined): Promise<WhatsAppStatus> {
  if (!workspaceId) return NOT_CONNECTED;

  try {
    const rows = await prisma.socialIntegration.findMany({
      where: { workspaceId, platform: { in: ["WHATSAPP", "INSTAGRAM", "MESSENGER"] }, status: { in: LINKED_STATUSES } },
      select: { platform: true, providerAccountId: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    const whatsapp = rows.filter((row) => row.platform === "WHATSAPP");
    return {
      connected: rows.length > 0,
      count: whatsapp.length,
      expired: rows.some((row) => row.status === TOKEN_EXPIRED),
      phoneId: whatsapp.find((row) => row.status === "ACTIVE")?.providerAccountId ?? null,
    };
  } catch (err) {
    console.error("[whatsapp/status] database lookup failed", err);
    return NOT_CONNECTED;
  }
}
