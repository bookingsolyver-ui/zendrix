import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ProofsPanel } from "@/components/dashboard/payments/proofs-panel";
import { requireActivePlanForPage } from "@/lib/billing/access";

export default async function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireActivePlanForPage(locale);
  return (
    <>
      <DashboardPageHeader title="Comprovativos" subtitle="Pagamentos por transferência: valide o comprovativo e o cliente recebe a confirmação no WhatsApp." />
      <ProofsPanel />
    </>
  );
}
