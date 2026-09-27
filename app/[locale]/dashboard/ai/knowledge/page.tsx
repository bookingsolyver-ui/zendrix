import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PersonaForm } from "@/components/dashboard/ai/persona-form";
import { KnowledgeSources } from "@/components/dashboard/ai/knowledge-sources";

export default async function AiKnowledgePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Treine o seu Assistente IA"
        subtitle="Defina a personalidade do assistente e as fontes de dados que ele vai aprender."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PersonaForm />
        <KnowledgeSources />
      </div>
    </>
  );
}
