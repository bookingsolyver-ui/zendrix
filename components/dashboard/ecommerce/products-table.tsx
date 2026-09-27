"use client";

import { useState } from "react";
import { Coins, DollarSign, Euro, Package } from "lucide-react";
import { INITIAL_PRODUCTS } from "@/components/dashboard/ecommerce/products-data";

export function ProductsTable() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);

  function toggleActive(id: string) {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id ? { ...product, active: !product.active } : product,
      ),
    );
  }

  return (
    <div className="glow-border overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="px-5 py-3 font-medium">Imagem</th>
            <th className="px-5 py-3 font-medium">Nome</th>
            <th className="px-5 py-3 font-medium">Preço</th>
            <th className="px-5 py-3 font-medium">Vendas</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border last:border-b-0">
              <td className="px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
                  <Package className="h-4 w-4 text-muted" />
                </span>
              </td>
              <td className="px-5 py-4 font-medium text-foreground">{product.name}</td>
              <td className="px-5 py-4">
                <div className="flex flex-col gap-1 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-neon-green" />
                    Kz {product.priceKz}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Euro className="h-3.5 w-3.5" />
                    {product.priceEur}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    {product.priceUsd}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 text-muted">{product.sales}</td>
              <td className="px-5 py-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={product.active}
                  onClick={() => toggleActive(product.id)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    product.active
                      ? "bg-neon-green/10 text-neon-green"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${product.active ? "bg-neon-green" : "bg-muted"}`}
                  />
                  {product.active ? "Ativo" : "Inativo"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
