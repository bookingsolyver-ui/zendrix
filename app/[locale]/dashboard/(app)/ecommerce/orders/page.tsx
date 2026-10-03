import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { OrdersTable } from "@/components/dashboard/ecommerce/orders/orders-table";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Pedidos"
        subtitle="Acompanhe todos os pedidos da sua loja em tempo real."
      />
      <OrdersTable />
    </>
  );
}
