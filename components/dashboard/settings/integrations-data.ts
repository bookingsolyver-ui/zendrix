import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  CreditCard,
  Megaphone,
  ShoppingBag,
  Smartphone,
  Store,
  Wallet,
} from "lucide-react";

export type Integration = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  connectedByDefault?: boolean;
};

export const INTEGRATIONS: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Processe pagamentos globais com cartão.",
    icon: CreditCard,
    tint: "#7c5cff",
    connectedByDefault: true,
  },
  {
    id: "multicaixa",
    name: "Multicaixa Express",
    description: "Aceite pagamentos locais via referência Multicaixa.",
    icon: Smartphone,
    tint: "#e0393e",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Receba pagamentos internacionais com PayPal.",
    icon: Wallet,
    tint: "#3b82f6",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Sincronize o seu catálogo com a Shopify.",
    icon: ShoppingBag,
    tint: "#95bf47",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Ligue a sua loja WordPress/WooCommerce.",
    icon: Store,
    tint: "#9b5c8f",
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    description: "Importe leads e otimize campanhas no Meta Ads.",
    icon: Megaphone,
    tint: "#0866ff",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Potencie o assistente de IA com modelos OpenAI.",
    icon: BrainCircuit,
    tint: "#10a37f",
  },
];
