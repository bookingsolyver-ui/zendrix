import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Package,
  Plug,
  Settings,
  ShoppingCart,
  Sparkles,
  Target,
  Truck,
  UserCog,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";

export type NavLeaf = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavLeaf[];
};

export type NavEntry = ({ type: "link" } & NavLeaf) | ({ type: "group" } & NavGroup);

export const NAV_ENTRIES: NavEntry[] = [
  { type: "link", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "link", label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  {
    type: "group",
    label: "CRM",
    icon: KanbanSquare,
    items: [
      { label: "Quadros", href: "/dashboard/crm/quadros", icon: KanbanSquare },
      { label: "Agenda", href: "/dashboard/crm/agenda", icon: Calendar },
      { label: "Docs", href: "/dashboard/crm/docs", icon: FileText },
    ],
  },
  {
    type: "group",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { label: "Campanhas", href: "/dashboard/marketing/campanhas", icon: Megaphone },
      { label: "Automações", href: "/dashboard/marketing/automacoes", icon: Workflow },
      { label: "Templates", href: "/dashboard/marketing/templates", icon: LayoutTemplate },
      { label: "Popups", href: "/dashboard/marketing/popups", icon: Sparkles },
    ],
  },
  {
    type: "group",
    label: "Contatos",
    icon: Users,
    items: [
      { label: "Todos", href: "/dashboard/contatos/todos", icon: Users },
      { label: "Segmentos", href: "/dashboard/contatos/segmentos", icon: Filter },
    ],
  },
  {
    type: "group",
    label: "IA",
    icon: BrainCircuit,
    items: [
      { label: "Visão geral", href: "/dashboard/ia/visao-geral", icon: BrainCircuit },
      { label: "Persona", href: "/dashboard/ia/persona", icon: UserCog },
      { label: "Conhecimento", href: "/dashboard/ia/conhecimento", icon: BookOpen },
    ],
  },
  {
    type: "group",
    label: "E-commerce",
    icon: ShoppingCart,
    items: [
      { label: "Pedidos", href: "/dashboard/ecommerce/pedidos", icon: ShoppingCart },
      { label: "Produtos", href: "/dashboard/ecommerce/produtos", icon: Package },
      { label: "Checkouts", href: "/dashboard/ecommerce/checkouts", icon: CreditCard },
      { label: "Rastreio", href: "/dashboard/ecommerce/rastreio", icon: Truck },
    ],
  },
  {
    type: "group",
    label: "Analytics",
    icon: BarChart3,
    items: [
      { label: "Geral", href: "/dashboard/analytics/geral", icon: BarChart3 },
      { label: "Receita", href: "/dashboard/analytics/receita", icon: DollarSign },
      { label: "Métricas", href: "/dashboard/analytics/metricas", icon: Activity },
      { label: "RFM", href: "/dashboard/analytics/rfm", icon: Target },
    ],
  },
];

export const NAV_FOOTER_ENTRIES: NavLeaf[] = [
  { label: "Integrações", href: "/dashboard/settings/integracoes", icon: Plug },
  { label: "Webhooks", href: "/dashboard/settings/webhooks", icon: Webhook },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];
