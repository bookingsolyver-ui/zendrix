import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Zentrix - Venda globalmente, receba localmente",
  description:
    "Zentrix é a plataforma global de pagamentos e e-commerce que liga o seu negócio a clientes em todo o mundo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
