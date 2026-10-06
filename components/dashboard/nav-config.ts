import type { LucideIcon } from "lucide-react";
import { isFeatureEnabled, type FeatureId } from "@/lib/features";
import {
  Activity,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Calendar,
  CreditCard,
  DollarSign,
  FileSignature,
  FileText,
  Filter,
  GitMerge,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Package,
  Plug,
  Receipt,
  Rocket,
  Settings,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  Upload,
  UserCog,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

export type NavLeaf = {
  label: string;
  href: string;
  icon: LucideIcon;
  // Só aparece se esta funcionalidade estiver pronta (lib/features.ts).
  feature?: FeatureId;
  // Só proprietários e gestores (as páginas e as APIs recusam os vendedores).
  managersOnly?: boolean;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  feature?: FeatureId;
  items: NavLeaf[];
};

export type NavEntry =
  ({ type: "link" } & NavLeaf) | ({ type: "group" } & NavGroup);

const ALL_NAV_ENTRIES: NavEntry[] = [
  {
    type: "link",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  { type: "link", label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  {
    type: "group",
    label: "CRM",
    icon: KanbanSquare,
    feature: "crm",
    items: [
      { label: "Quadros", href: "/dashboard/crm/boards", icon: KanbanSquare },
      { label: "Agenda", href: "/dashboard/crm/agenda", icon: Calendar },
      { label: "Docs", href: "/dashboard/crm/docs", icon: FileText },
    ],
  },
  {
    type: "group",
    label: "Marketing",
    icon: Megaphone,
    feature: "marketing",
    items: [
      {
        label: "Campanhas",
        href: "/dashboard/marketing/campaigns",
        icon: Megaphone,
        feature: "campaigns",
      },
      {
        label: "Automações",
        href: "/dashboard/marketing/automations",
        icon: Workflow,
        feature: "marketingAutomations",
      },
      {
        label: "Templates",
        href: "/dashboard/marketing/templates",
        icon: LayoutTemplate,
        feature: "templates",
      },
      { label: "Popups", href: "/dashboard/marketing/popups", icon: Sparkles, feature: "popups" },
    ],
  },
  {
    type: "group",
    label: "Contatos",
    icon: Users,
    items: [
      { label: "Todos", href: "/dashboard/contacts", icon: Users },
      {
        label: "Segmentos",
        href: "/dashboard/contatos/segmentos",
        icon: Filter,
        feature: "segments",
      },
      { label: "Importar", href: "/dashboard/contacts/import", icon: Upload, managersOnly: true },
      { label: "Previsões Financeiras", href: "/dashboard/contacts/forecast", icon: TrendingUp, managersOnly: true },
      { label: "Orçamentos B2B", href: "/dashboard/contacts/proposals", icon: FileSignature, managersOnly: true },
      { label: "Cobranças Auto", href: "/dashboard/contacts/receivables", icon: Receipt, managersOnly: true },
      { label: "Limpeza de Dados", href: "/dashboard/contacts/duplicates", icon: GitMerge, managersOnly: true },
    ],
  },
  {
    type: "group",
    label: "IA",
    icon: BrainCircuit,
    items: [
      {
        label: "Visão geral",
        href: "/dashboard/ai/overview",
        icon: BrainCircuit,
      },
      { label: "Persona", href: "/dashboard/ai/settings", icon: UserCog, feature: "aiPersona" },
      {
        label: "Conhecimento",
        href: "/dashboard/settings/business",
        icon: BookOpen,
      },
    ],
  },
  {
    type: "group",
    label: "E-commerce",
    icon: ShoppingCart,
    feature: "ecommerce",
    items: [
      {
        label: "Pedidos",
        href: "/dashboard/ecommerce/orders",
        icon: ShoppingCart,
      },
      {
        label: "Produtos",
        href: "/dashboard/ecommerce/products",
        icon: Package,
      },
      {
        label: "Checkouts",
        href: "/dashboard/ecommerce/checkouts",
        icon: CreditCard,
      },
      { label: "Rastreio", href: "/dashboard/ecommerce/tracking", icon: Truck },
    ],
  },
  {
    type: "group",
    label: "Analytics",
    icon: BarChart3,
    feature: "analytics",
    items: [
      {
        label: "Geral",
        href: "/dashboard/analytics/overview",
        icon: BarChart3,
      },
      {
        label: "Receita",
        href: "/dashboard/analytics/revenue",
        icon: DollarSign,
      },
      {
        label: "Métricas",
        href: "/dashboard/analytics/metrics",
        icon: Activity,
      },
      { label: "RFM", href: "/dashboard/analytics/rfm", icon: Target },
    ],
  },
];

const ALL_NAV_FOOTER_ENTRIES: NavLeaf[] = [
  { label: "Integrações", href: "/dashboard/integrations", icon: Plug, feature: "integrations" },
  { label: "Webhooks", href: "/dashboard/webhooks", icon: Webhook, feature: "webhooks" },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];

// O que o menu mostra: só as funcionalidades prontas. Um grupo que fica sem itens desaparece, e um grupo com um
// único item vira uma ligação direta (sem submenu de um só item).
const enabled = (item: { feature?: FeatureId }) => !item.feature || isFeatureEnabled(item.feature);

export const NAV_ENTRIES: NavEntry[] = ALL_NAV_ENTRIES.flatMap((entry): NavEntry[] => {
  if (!enabled(entry)) return [];
  if (entry.type === "link") return [entry];
  const items = entry.items.filter(enabled);
  if (items.length === 0) return [];
  if (items.length === 1) return [{ type: "link", ...items[0], label: entry.label }];
  return [{ ...entry, items }];
});

export const NAV_FOOTER_ENTRIES: NavLeaf[] = ALL_NAV_FOOTER_ENTRIES.filter(enabled);

// A Nave-Mãe (super-admin da equipa Zetrix): fora do menu normal; só se mostra a quem o servidor confirmar (ver o layout do painel).
export const MOTHERSHIP_LINK: NavLeaf = { label: "Nave-Mãe (God Mode)", href: "/super-admin", icon: Rocket };
