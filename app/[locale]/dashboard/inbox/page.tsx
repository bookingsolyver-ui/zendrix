import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { InboxShell } from "@/components/dashboard/inbox/inbox-shell";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Inbox" subtitle="Todas as conversas dos seus canais num só lugar." />
      <InboxShell />
    </>
  );
}
