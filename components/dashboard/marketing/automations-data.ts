import type { LucideIcon } from "lucide-react";
import { PartyPopper, Receipt, ShoppingCart } from "lucide-react";

export type Automation = {
  id: string;
  icon: LucideIcon;
  title: string;
  trigger: string;
  conversion: string;
  sends: string;
  active: boolean;
};

export const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: "cart-recovery",
    icon: ShoppingCart,
    title: "Recuperação de Carrinho (WhatsApp)",
    trigger: "Envia um lembrete por WhatsApp 1 hora após o abandono do carrinho.",
    conversion: "85% conversão",
    sends: "1.2k envios",
    active: true,
  },
  {
    id: "welcome",
    icon: PartyPopper,
    title: "Boas-vindas a Novos Clientes",
    trigger: "Mensagem automática enviada assim que um novo cliente se regista.",
    conversion: "62% abertura",
    sends: "480 envios",
    active: true,
  },
  {
    id: "overdue-billing",
    icon: Receipt,
    title: "Cobrança de Boleto/Referência Vencida",
    trigger: "Notifica o cliente 24h antes e no dia do vencimento da referência de pagamento.",
    conversion: "41% conversão",
    sends: "310 envios",
    active: false,
  },
];
