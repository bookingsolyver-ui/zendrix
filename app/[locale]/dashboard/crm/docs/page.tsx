import { setRequestLocale } from "next-intl/server";
import { FileText, Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DocCard } from "@/components/dashboard/crm/docs/doc-card";
import { DOCS } from "@/components/dashboard/crm/docs/docs-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { SoonButton } from "@/components/ui/soon-button";

export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Docs"
        subtitle="Documentos, guiões e políticas partilhadas com a equipa."
        action={
          <SoonButton feature="Novo Documento"
            type="button"
            className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-4 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
          >
            <Plus className="h-4 w-4" />
            Novo Documento
          </SoonButton>
        }
      />

      {DOCS.length === 0 ? (
        <MarketingEmptyState
          icon={FileText}
          title="Nenhum documento criado"
          description="Os documentos e guiões partilhados com a sua equipa vão aparecer aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </>
  );
}
