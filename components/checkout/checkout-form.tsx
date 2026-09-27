import { BuyerForm } from "@/components/checkout/buyer-form";
import { PaymentMethods } from "@/components/checkout/payment-methods";
import { PayButton } from "@/components/checkout/pay-button";
import { formatKz } from "@/components/checkout/format";
import { TOTAL } from "@/components/checkout/order-data";

export function CheckoutForm() {
  return (
    <div className="space-y-8">
      <BuyerForm />
      <PaymentMethods />
      <PayButton label={`Pagar ${formatKz(TOTAL, false)}`} />
    </div>
  );
}
