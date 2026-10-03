import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { InboxShell } from "@/components/dashboard/inbox/inbox-shell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { requireActivePlanForPage } from "@/lib/billing/access";
import { getWhatsAppStatus } from "@/lib/whatsapp/status";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireActivePlanForPage(locale);

  const user = await getCurrentUser();
  const whatsapp = await getWhatsAppStatus(user?.workspace?.id);

  return (
    <>
      <DashboardPageHeader title="Inbox" subtitle="Todas as conversas dos seus canais num só lugar." />
      <InboxShell whatsapp={whatsapp} />
    </>
  );
}
