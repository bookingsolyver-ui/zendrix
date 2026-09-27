import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { CheckoutStats } from "@/components/dashboard/ecommerce/checkouts/checkout-stats";
import { CheckoutsList } from "@/components/dashboard/ecommerce/checkouts/checkouts-list";

export default async function CheckoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Checkouts Abandonados"
        subtitle="Recupere vendas perdidas contactando clientes que não terminaram a compra."
      />

      <CheckoutStats />

      <div className="mt-6">
        <CheckoutsList />
      </div>
    </>
  );
}
