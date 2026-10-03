import { setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { WebhooksList } from "@/components/dashboard/webhooks/webhooks-list";
import { SoonButton } from "@/components/ui/soon-button";

export default async function WebhooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Webhooks e API"
        subtitle="Configure endpoints para receber eventos da Zetrix em tempo real."
        action={
          <SoonButton feature="Adicionar Endpoint"
            type="button"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Adicionar Endpoint
          </SoonButton>
        }
      />
      <WebhooksList />
    </>
  );
}
