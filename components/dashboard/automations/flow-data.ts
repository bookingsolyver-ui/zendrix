import type { LucideIcon } from "lucide-react";
import {
  Clock,
  CreditCard,
  FlaskConical,
  GitBranch,
  Mic,
  Send,
  ShoppingCart,
  Tag,
  UserPlus,
} from "lucide-react";

export type ToolboxItem = {
  icon: LucideIcon;
  label: string;
};

export type ToolboxGroup = {
  label: string;
  items: ToolboxItem[];
};

export const TOOLBOX_GROUPS: ToolboxGroup[] = [
  {
    label: "Gatilhos",
    items: [
      { icon: ShoppingCart, label: "Carrinho Abandonado" },
      { icon: CreditCard, label: "Pedido Pago" },
      { icon: Tag, label: "Tag Adicionada" },
    ],
  },
  {
    label: "Lógica",
    items: [
      { icon: Clock, label: "Aguardar Tempo" },
      { icon: GitBranch, label: "Condição (Se/Senão)" },
      { icon: FlaskConical, label: "Teste A/B" },
    ],
  },
  {
    label: "Ações",
    items: [
      { icon: Send, label: "Enviar WhatsApp" },
      { icon: Mic, label: "Enviar Áudio IA" },
      { icon: UserPlus, label: "Adicionar ao CRM" },
    ],
  },
];

export type FlowNodeId = "node-1" | "node-2" | "node-3";

export type FlowNode = {
  id: FlowNodeId;
  kind: "trigger" | "logic" | "action";
  icon: LucideIcon;
  iconClassName: string;
  ringClassName: string;
  eyebrow: string;
  title: string;
  active?: boolean;
};

export const FLOW_NODES: FlowNode[] = [
  {
    id: "node-1",
    kind: "trigger",
    icon: ShoppingCart,
    iconClassName: "bg-red-500/10 text-red-400",
    ringClassName: "ring-red-500/50",
    eyebrow: "Gatilho",
    title: "Carrinho Abandonado",
  },
  {
    id: "node-2",
    kind: "logic",
    icon: Clock,
    iconClassName: "bg-white/10 text-neutral-300",
    ringClassName: "ring-white/30",
    eyebrow: "Lógica",
    title: "Aguardar 20 minutos",
  },
  {
    id: "node-3",
    kind: "action",
    icon: Send,
    iconClassName: "bg-emerald-500/10 text-emerald-400",
    ringClassName: "ring-emerald-500/50",
    eyebrow: "Ação",
    title: "Enviar Template: 15% OFF",
    active: true,
  },
];
