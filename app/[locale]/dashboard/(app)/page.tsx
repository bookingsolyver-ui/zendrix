import { setRequestLocale } from "next-intl/server";
import { TrialBanner } from "@/components/dashboard/overview/trial-banner";
import { OverviewStatsCards } from "@/components/dashboard/overview/overview-stats";
import { getOverviewStats } from "@/lib/overview/stats";
import { WhatsappGate } from "@/components/dashboard/overview/whatsapp-gate";
import { msUntil } from "@/lib/trial";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireActivePlanForPage } from "@/lib/billing/access";
import { SetupChecklist } from "@/components/dashboard/onboarding/setup-checklist";
import { getSetupProgress } from "@/lib/onboarding/progress";
import { getWhatsAppStatus } from "@/lib/whatsapp/status";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireActivePlanForPage(locale);

  const user = await getCurrentUser();
  const whatsapp = await getWhatsAppStatus(user?.workspace?.id);
  // Quem acabou de chegar não cai numa painel vazio: vê os primeiros passos (só quem os pode fazer).
  const canSetup = user?.role === "OWNER" || user?.role === "MANAGER";
  const [setup, stats] = user?.workspace
    ? await Promise.all([
        canSetup ? getSetupProgress(user.workspace.id) : Promise.resolve(null),
        getOverviewStats(user.workspace.id),
      ])
    : [null, null];

  return (
    <>
      {user?.workspace && (
        <TrialBanner
          subStatus={user.workspace.subStatus}
          msLeft={msUntil(user.workspace.trialEndsAt)}
        />
      )}
      {setup && <SetupChecklist progress={setup} />}
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
      <WhatsappGate connected={whatsapp.connected} />
      {stats && (
        <div className="mt-6">
          <OverviewStatsCards stats={stats} />
        </div>
      )}
    </>
  );
}
