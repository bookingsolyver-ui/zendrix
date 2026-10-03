import { setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ProductsTable } from "@/components/dashboard/ecommerce/products-table";
import { SoonButton } from "@/components/ui/soon-button";

export default async function EcommerceProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Produtos"
        subtitle="Crie e organize o catálogo de produtos da sua loja."
        action={
          <SoonButton feature="Novo Produto"
            type="button"
            className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-4 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </SoonButton>
        }
      />
      <ProductsTable />
    </>
  );
}
