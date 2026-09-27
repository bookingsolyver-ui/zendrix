"use client";

import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import { ORDERS, STATUS_LABELS, STATUS_STYLES } from "@/components/dashboard/ecommerce/orders/orders-data";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OrdersTable() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ORDERS;
    return ORDERS.filter(
      (order) =>
        order.customer.toLowerCase().includes(normalized) ||
        order.id.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Procurar pedidos..."
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/40">
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr
                key={order.id}
                className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
              >
                <td className="px-5 py-4 font-mono text-white/70">{order.id}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                      {initials(order.customer)}
                    </span>
                    <span className="font-medium text-white">{order.customer}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-medium text-white">{order.amount}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-5 py-4 text-white/50">{order.date}</td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <Package className="mx-auto h-8 w-8 text-white/20" strokeWidth={1.5} />
                  <p className="mt-3 text-sm text-white/50">Nenhum pedido encontrado.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
