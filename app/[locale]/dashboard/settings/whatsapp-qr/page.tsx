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

  return (
    <>
      <DashboardPageHeader title="WhatsApp por QR Code" subtitle="Ligue o seu número lendo um código, sem burocracia da Meta." />
      <div className="max-w-xl">
        {canManage ? (
          <OpenWaQr initiallyConnected={connected} />
        ) : (
          <p className="text-sm text-white/60">Apenas o proprietário ou um gestor pode ligar canais.</p>
        )}
      </div>
    </>
  );
}
