import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { OpenWaQr } from "@/components/dashboard/settings/channels/openwa-qr";
import { getCurrentUser } from "@/lib/auth/current-user";
import { QR_PREFIX } from "@/lib/openwa/config";
import { prisma } from "@/lib/prisma";

export default async function WhatsAppQrPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const connected = user?.workspace
    ? (await prisma.socialIntegration.count({
        where: { workspaceId: user.workspace.id, platform: "WHATSAPP", status: "ACTIVE", providerAccountId: { startsWith: QR_PREFIX } },
      })) > 0
    : false;

  // Canal oficial da Meta ativo: só um WhatsApp de cada vez, por isso o ecrã oferece desligá-lo.
  const official = user?.workspace
    ? await prisma.socialIntegration.findFirst({
        where: {
          workspaceId: user.workspace.id,
          platform: "WHATSAPP",
          status: { in: ["ACTIVE", "TOKEN_EXPIRED"] },
          NOT: { providerAccountId: { startsWith: QR_PREFIX } },
        },
        select: { id: true, providerAccountId: true },
      })
    : null;

  return (
    <>
      <DashboardPageHeader title="WhatsApp por QR Code" subtitle="Ligue o seu número lendo um código, sem burocracia da Meta." />
      <div className="max-w-xl">
        {canManage ? (
          <OpenWaQr
            initiallyConnected={connected}
            officialChannel={official?.providerAccountId ? { id: official.id, idTail: official.providerAccountId.slice(-4) } : null}
          />
        ) : (
          <p className="text-sm text-white/60">Apenas o proprietário ou um gestor pode ligar canais.</p>
        )}
      </div>
    </>
  );
}
