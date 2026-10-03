import { setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AutomationList } from "@/components/dashboard/marketing/automation-list";

export default async function MarketingAutomationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Fluxos de Automação"
        subtitle="Configure fluxos automáticos para nutrir e converter os seus contactos."
        action={
          <Link
            href="/dashboard/automations/builder"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Criar Fluxo
          </Link>
        }
      />
      <AutomationList />
    </>
  );
}
