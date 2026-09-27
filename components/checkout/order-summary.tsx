"use client";

import { useState } from "react";
import { ChevronDown, Package } from "lucide-react";
import { ORDER_ITEMS, PROCESSING_FEE, STORE_NAME, SUBTOTAL, TOTAL } from "@/components/checkout/order-data";
import { formatKz } from "@/components/checkout/format";

export function OrderSummary({ orderId }: { orderId: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className="bg-[#05060a] text-white lg:flex lg:w-[420px] lg:shrink-0 lg:flex-col lg:justify-between">
      <div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between px-6 py-4 lg:hidden"
        >
          <span className="text-sm font-medium text-white/70">Resumo do pedido</span>
          <span className="flex items-center gap-2 text-sm font-semibold">
            {formatKz(TOTAL)}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </span>
        </button>

        <div className={`${expanded ? "block" : "hidden"} px-6 pb-6 lg:!block lg:px-10 lg:py-12`}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
              {STORE_NAME.charAt(0)}
            </span>
            <div>
              <p className="text-sm font-semibold">{STORE_NAME}</p>
              <p className="text-xs text-white/40">Pedido #{orderId}</p>
            </div>
          </div>

          <ul className="mt-8 space-y-4">
            {ORDER_ITEMS.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Package className="h-5 w-5 text-white/40" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-white/40">Qtd. {item.qty}</p>
                </div>
                <p className="shrink-0 text-sm font-medium">{formatKz(item.price)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-8 space-y-2 border-t border-white/10 pt-5 text-sm">
            <div className="flex items-center justify-between text-white/60">
              <span>Subtotal</span>
              <span>{formatKz(SUBTOTAL)}</span>
            </div>
            <div className="flex items-center justify-between text-white/60">
              <span>Taxa de processamento</span>
              <span>{formatKz(PROCESSING_FEE)}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            <span className="text-sm font-medium text-white/80">Total</span>
            <span className="neon-green-text text-2xl font-semibold">{formatKz(TOTAL)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 px-6 py-4 lg:px-10 lg:py-6">
        <p className="flex items-center gap-1.5 text-xs text-white/30">
          Powered by <span className="font-semibold text-white/50">Zentrix</span>
        </p>
      </div>
    </aside>
  );
}
