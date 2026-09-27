import { setRequestLocale } from "next-intl/server";
import { OrderSummary } from "@/components/checkout/order-summary";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-white lg:flex">
      <OrderSummary orderId={id} />

      <div className="flex-1 bg-neutral-50 px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-center lg:px-16 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <CheckoutForm />
        </div>
      </div>
    </div>
  );
}
