import { setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CurrentUserProvider } from "@/components/dashboard/current-user-context";
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
      <DashboardShell>{children}</DashboardShell>
    </CurrentUserProvider>
  );
}
