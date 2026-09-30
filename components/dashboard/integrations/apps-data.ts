import type { LucideIcon } from "lucide-react";
import { CreditCard, Rocket, ShoppingBag, Smartphone, Store } from "lucide-react";

export type AppCategory = "ecommerce" | "pagamentos" | "marketing" | "desenvolvedores";

export type IntegrationApp = {
  id: string;
  name: string;
  description: string;
  niche: string;
  category: AppCategory;
  icon: LucideIcon;
  tint: string;
  connected?: boolean;
};

export const FILTERS: { id: "all" | AppCategory; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "marketing", label: "Marketing" },
  { id: "desenvolvedores", label: "Desenvolvedores" },
];

export const INTEGRATION_APPS: IntegrationApp[] = [
  {
    id: "multicaixa",
    name: "Multicaixa Express",
    description: "Aceite pagamentos locais via referência e QR Code Multicaixa.",
    niche: "Pagamentos",
    category: "pagamentos",
    icon: Smartphone,
    tint: "#e0393e",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Processe pagamentos globais com cartão em mais de 190 países.",
    niche: "Pagamentos",
    category: "pagamentos",
    icon: CreditCard,
    tint: "#7c5cff",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Sincronize catálogo, stock e pedidos com a sua loja Shopify.",
    niche: "E-commerce",
    category: "ecommerce",
    icon: ShoppingBag,
    tint: "#95bf47",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Ligue a sua loja WordPress/WooCommerce à Zentrix em minutos.",
    niche: "E-commerce",
    category: "ecommerce",
    icon: Store,
    tint: "#9b5c8f",
  },
  {
    id: "hotmart",
    name: "Hotmart",
    description: "Sincronize vendas de cursos e infoprodutos automaticamente.",
    niche: "Infoprodutos",
    category: "marketing",
    icon: Rocket,
    tint: "#f0433d",
  },
];
