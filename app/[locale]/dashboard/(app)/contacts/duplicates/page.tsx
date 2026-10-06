import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DuplicatesPanel } from "@/components/dashboard/import/duplicates-panel";

// Data-Cleaner: página nova (ver docs/zetrix-expansion.md para o link).
export default async function DuplicatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div>
      <DashboardPageHeader title="Clientes duplicados" subtitle="Reveja e funda os registos que parecem ser a mesma pessoa. Nada é apagado." />
      <DuplicatesPanel />
    </div>
  );
}
