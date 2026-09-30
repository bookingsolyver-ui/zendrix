import { prisma } from "@/lib/prisma";

export interface WhatsAppStatus {
  connected: boolean;
  count: number;
  // Phone number ID of the newest active integration. Never includes the access token.
  phoneId: string | null;
}

const NOT_CONNECTED: WhatsAppStatus = { connected: false, count: 0, phoneId: null };

// Real connection state, read from the workspace's SocialIntegration rows.
export async function getWhatsAppStatus(workspaceId: string | undefined): Promise<WhatsAppStatus> {
  if (!workspaceId) return NOT_CONNECTED;

  try {
    const rows = await prisma.socialIntegration.findMany({
      where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE" },
      select: { providerAccountId: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      connected: rows.length > 0,
      count: rows.length,
      phoneId: rows[0]?.providerAccountId ?? null,
    };
  } catch (err) {
    console.error("[whatsapp/status] database lookup failed", err);
    return NOT_CONNECTED;
  }
}
