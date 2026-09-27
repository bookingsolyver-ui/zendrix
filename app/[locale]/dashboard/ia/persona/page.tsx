import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

export default async function AiPersonaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader title="Persona" subtitle="Defina a personalidade e o tom do seu assistente de IA." />
      <DashboardEmptyState message="Em construção — os dados aparecerão aqui em breve." />
    </>
  );
}
