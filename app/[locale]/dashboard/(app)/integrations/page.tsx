import { setRequestLocale } from "next-intl/server";
import { IntegrationsExplorer } from "@/components/dashboard/integrations/integrations-explorer";
import { DeveloperSection } from "@/components/dashboard/integrations/developer-section";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Conecte o seu ecossistema
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Ligue a Zetrix às suas plataformas de e-commerce, pagamentos e CRMs em 2 cliques.
        </p>
      </div>

      <IntegrationsExplorer />

      <div className="mt-10">
        <DeveloperSection />
      </div>
    </>
  );
}
