import { setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CurrentUserProvider } from "@/components/dashboard/current-user-context";
import { ChannelsHealthBanner } from "@/components/dashboard/channels-health-banner";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();

  return (
    <CurrentUserProvider user={user}>
      <DashboardShell>
        <ChannelsHealthBanner workspaceId={user?.workspace?.id} />
        {children}
      </DashboardShell>
    </CurrentUserProvider>
  );
}
