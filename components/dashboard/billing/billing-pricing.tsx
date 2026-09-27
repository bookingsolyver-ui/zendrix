"use client";

import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import {
  CURRENCIES,
  CYCLES,
  FEATURE_ROWS,
  PLANS,
  formatPrice,
  getCyclePerMonth,
  getCycleTotal,
  type Currency,
  type Cycle,
} from "@/components/dashboard/billing/pricing-data";

export function BillingPricing() {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const activeCycle = useMemo(() => CYCLES.find((c) => c.code === cycle)!, [cycle]);

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Tabela de preços global</h2>
            <p className="mt-1 text-sm text-muted">
              Compare os planos e escolha a moeda e o ciclo de faturação.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted">
              Moeda
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
                className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              >
                {CURRENCIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.symbol} — {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted">
              Ciclo
              <select
                value={cycle}
                onChange={(event) => setCycle(event.target.value as Cycle)}
                className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
              >
                {CYCLES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                    {item.discountPct > 0 ? ` (-${item.discountPct}%)` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const total = getCycleTotal(plan.id, currency, cycle);
            const perMonth = getCyclePerMonth(plan.id, currency, cycle);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-6 ${
                  plan.highlight
                    ? "border-2 border-neon-green/70 bg-surface lg:-translate-y-2 lg:scale-[1.02]"
                    : "glow-border"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-background">
                    Mais popular
                  </span>
                )}

                <h3 className="text-base font-semibold">{plan.name}</h3>
                <p className="mt-1.5 text-sm text-muted">{plan.description}</p>

                <div className="mt-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">
                      {formatPrice(perMonth, currency)}
                    </span>
                    <span className="text-sm text-muted">/ mês</span>
                  </div>
                  {activeCycle.months > 1 && (
                    <p className="mt-1 text-xs text-muted">
                      {formatPrice(total, currency)} cobrados a cada {activeCycle.months} meses
                    </p>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`mt-6 w-full rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? "neon-green-btn bg-green-500 text-background hover:bg-green-400"
                      : "glow-border text-foreground hover:border-primary"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Comparação completa de funcionalidades</h2>
        <p className="mt-1 text-sm text-muted">
          Veja em detalhe os limites e recursos disponíveis em cada plano.
        </p>

        <div className="glow-border mt-6 overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-5 py-3 font-medium">Funcionalidade</th>
                {PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className={`px-5 py-3 font-medium ${plan.highlight ? "text-neon-green" : ""}`}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-b-0">
                  <td className="px-5 py-3.5 font-medium text-foreground">{row.label}</td>
                  {row.values.map((value, index) => (
                    <td key={`${row.label}-${index}`} className="px-5 py-3.5 text-muted">
                      {value === "—" ? (
                        <Minus className="h-4 w-4 text-muted/60" />
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
