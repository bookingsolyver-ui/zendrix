import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { FollowUpsForm } from "@/components/dashboard/settings/followups/followups-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DEFAULT_FOLLOWUP_CONFIG, parseFollowUpConfig } from "@/lib/followups/config";
import { prisma } from "@/lib/prisma";

export default async function FollowUpsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const workspace = user?.workspace
    ? await prisma.workspace.findUnique({ where: { id: user.workspace.id }, select: { followUpConfig: true, agentEnabled: true } })
    : null;

  return (
    <>
      <DashboardPageHeader title="Reengajamento" subtitle="A IA volta a falar com quem deixou de responder, respeitando a janela e as regras da Meta." />
      {workspace && canManage ? (
        <FollowUpsForm initial={parseFollowUpConfig(workspace.followUpConfig) ?? DEFAULT_FOLLOWUP_CONFIG} agentOn={workspace.agentEnabled} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Apenas o proprietário e os gestores podem configurar os seguimentos automáticos.
        </p>
      )}
    </>
  );
}
