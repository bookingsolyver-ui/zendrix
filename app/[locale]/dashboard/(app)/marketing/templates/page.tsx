import { setRequestLocale } from "next-intl/server";
import { MessageSquareText } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TemplateCard } from "@/components/dashboard/marketing/templates-list/template-card";
import { TEMPLATES } from "@/components/dashboard/marketing/templates-list/templates-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Templates de Mensagem"
        subtitle="Modelos aprovados pela Meta, prontos para usar nas suas campanhas e automações."
      />

      {TEMPLATES.length === 0 ? (
        <MarketingEmptyState
          icon={MessageSquareText}
          title="Nenhum template aprovado"
          description="Os seus templates de mensagem aprovados pela Meta vão aparecer aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </>
  );
}
