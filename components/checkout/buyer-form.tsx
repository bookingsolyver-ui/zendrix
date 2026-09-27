import { FloatingInput } from "@/components/checkout/floating-input";

export function BuyerForm() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Os seus dados</h2>
      <div className="mt-4 space-y-3">
        <FloatingInput id="full-name" label="Nome completo" autoComplete="name" />
        <FloatingInput id="email" label="E-mail" type="email" autoComplete="email" />
        <FloatingInput id="phone" label="Telemóvel" type="tel" inputMode="tel" autoComplete="tel" />
      </div>
    </div>
  );
}
