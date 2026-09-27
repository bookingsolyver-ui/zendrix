"use client";

import { useState } from "react";
import { CreditCard, QrCode, Smartphone } from "lucide-react";
import { PaymentMethodCard } from "@/components/checkout/payment-method-card";
import { FloatingInput } from "@/components/checkout/floating-input";
import { CardNetworkBadges } from "@/components/checkout/card-network-badges";

type Method = "multicaixa" | "card" | "pix";

export function PaymentMethods() {
  const [method, setMethod] = useState<Method>("multicaixa");
  const [pixCode, setPixCode] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Método de pagamento</h2>

      <div className="mt-4 space-y-3">
        <PaymentMethodCard
          icon={Smartphone}
          label="Multicaixa Express"
          selected={method === "multicaixa"}
          onSelect={() => setMethod("multicaixa")}
        >
          <FloatingInput
            id="multicaixa-phone"
            label="Número de telemóvel associado"
            type="tel"
            inputMode="tel"
          />
        </PaymentMethodCard>

        <PaymentMethodCard
          icon={CreditCard}
          label="Cartão de Crédito"
          selected={method === "card"}
          onSelect={() => setMethod("card")}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Dados do cartão</span>
              <CardNetworkBadges />
            </div>
            <FloatingInput
              id="card-number"
              label="Número do cartão"
              inputMode="numeric"
              maxLength={19}
            />
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput id="card-expiry" label="Validade (MM/AA)" inputMode="numeric" maxLength={5} />
              <FloatingInput id="card-cvv" label="CVV" inputMode="numeric" maxLength={4} />
            </div>
          </div>
        </PaymentMethodCard>

        <PaymentMethodCard
          icon={QrCode}
          label="PIX / Referência Bancária"
          selected={method === "pix"}
          onSelect={() => setMethod("pix")}
        >
          <div>
            <p className="text-sm text-neutral-500">
              Gere um código de pagamento e conclua a transferência a partir da sua aplicação
              bancária. A confirmação é automática.
            </p>

            {pixCode ? (
              <div className="mt-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xs font-medium text-emerald-700">Código de pagamento</p>
                <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-emerald-800">
                  {pixCode}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setPixCode(
                    `ZTX-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
                      .toString(36)
                      .slice(2, 6)
                      .toUpperCase()}`,
                  )
                }
                className="mt-3 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:border-emerald-500 hover:text-emerald-600"
              >
                Gerar Código
              </button>
            )}
          </div>
        </PaymentMethodCard>
      </div>
    </div>
  );
}
