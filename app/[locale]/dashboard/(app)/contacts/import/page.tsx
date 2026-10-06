import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MagicImporter } from "@/components/dashboard/import/magic-importer";
import { defaultDialCode } from "@/lib/import/service";

// Magic Importer: página nova, ligada a partir dos Contactos (ver docs/zetrix-automation.md para o link).
export default async function ImportContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div>
      <DashboardPageHeader title="Importar contactos" subtitle="Largue o ficheiro como está. Nós percebemos as colunas." />
      <MagicImporter defaultDialCode={defaultDialCode()} />
    </div>
  );
}
