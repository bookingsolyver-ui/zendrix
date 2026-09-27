import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { IntegrationsGrid } from "@/components/dashboard/settings/integrations-grid";

export default async function SettingsIntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Integrações e Gateways"
        subtitle="Ligue a Zentrix às ferramentas de pagamento, e-commerce e marketing que já utiliza."
      />
      <IntegrationsGrid />
    </>
  );
}
