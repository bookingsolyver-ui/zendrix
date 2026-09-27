import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TemplateCard } from "@/components/dashboard/marketing/templates-list/template-card";
import { TEMPLATES } from "@/components/dashboard/marketing/templates-list/templates-data";

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
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <p className="text-sm text-white/50">Ainda não criou nenhum template.</p>
        </div>
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
