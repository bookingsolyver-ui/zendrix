import { ok } from "@/lib/http/route";
import { openWaHealth } from "@/lib/openwa/health";
import { QR_PREFIX } from "@/lib/openwa/config";
import { prisma } from "@/lib/prisma";
import { superAdminGuarded } from "@/lib/superadmin/guard";
import { voiceboxHealth } from "@/lib/voicebox/health";

export const dynamic = "force-dynamic";

// Estado das integrações externas EM PRODUÇÃO (só o super-admin): Voicebox (voz) e OpenWA (WhatsApp por QR), mais a
// contagem de ligações QR por estado. Cada teste tem timeout próprio e nunca lança: um servidor em baixo aparece como
// «inacessível», não como erro 500.
export async function GET(request: Request) {
  return superAdminGuarded(request, "health", async () => {
    const [voicebox, openwa, rows] = await Promise.all([
      voiceboxHealth(),
      openWaHealth(),
      prisma.socialIntegration.groupBy({ by: ["status"], where: { platform: "WHATSAPP", providerAccountId: { startsWith: QR_PREFIX } }, _count: { _all: true } }).catch(() => []),
    ]);
    return ok({
      voicebox,
      openwa,
      qrChannels: Object.fromEntries(rows.map((row) => [row.status, row._count._all])),
      agentVoice: process.env.AGENT_VOICE === "true",
    });
  });
}
