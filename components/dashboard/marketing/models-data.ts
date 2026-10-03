import { Cake, CalendarClock, CreditCard, Gift, Heart, MessageSquareText, PartyPopper, ShoppingBag, Sparkles, UserPlus, Wallet } from "lucide-react";
import type { GalleryModel } from "@/components/dashboard/marketing/model-gallery";

// Modelos prontos: texto e estrutura de partida. Nada disto é enviado sem o cliente rever e ativar.

export const AUTOMATION_MODELS: GalleryModel[] = [
  {
    id: "welcome",
    icon: UserPlus,
    title: "Boas-vindas a novo contacto",
    category: "Relacionamento",
    meta: "2 mensagens · ~1 dia",
    description: "Apresenta o negócio logo após o primeiro contacto e pergunta o que a pessoa procura.",
    preview: "Olá {{nome}}, obrigado por falar connosco! Em que podemos ajudar?",
  },
  {
    id: "abandoned-cart",
    icon: ShoppingBag,
    title: "Carrinho abandonado",
    category: "Recuperação",
    meta: "3 mensagens · ~2 dias",
    description: "Lembra os artigos deixados no carrinho e facilita o regresso ao pagamento.",
    preview: "Olá {{nome}}, os seus artigos ainda estão guardados. Quer concluir a compra?",
  },
  {
    id: "payment-failed",
    icon: CreditCard,
    title: "Pagamento não concluído",
    category: "Recuperação",
    meta: "2 mensagens · ~1 dia",
    description: "Avisa que o pagamento não foi concluído e envia o link para tentar de novo.",
    preview: "Olá {{nome}}, o pagamento não foi concluído. Pode tentar novamente por este link.",
  },
  {
    id: "payment-confirmed",
    icon: Wallet,
    title: "Pagamento confirmado",
    category: "Transacional",
    meta: "1 mensagem · imediata",
    description: "Confirma a receção do pagamento e explica os próximos passos.",
    preview: "Recebemos o seu pagamento, {{nome}}. Obrigado pela confiança!",
  },
  {
    id: "appointment-reminder",
    icon: CalendarClock,
    title: "Lembrete de marcação",
    category: "Transacional",
    meta: "1 mensagem · 24 h antes",
    description: "Reduz faltas com um lembrete antes da hora marcada.",
    preview: "Olá {{nome}}, lembramos a sua marcação amanhã às {{hora}}.",
  },
  {
    id: "birthday",
    icon: Cake,
    title: "Aniversário do cliente",
    category: "Relacionamento",
    meta: "1 mensagem · no dia",
    description: "Uma mensagem de parabéns, com oferta opcional, na data do contacto.",
    preview: "Parabéns, {{nome}}! Preparámos uma surpresa para si.",
  },
];

export const POPUP_MODELS: GalleryModel[] = [
  {
    id: "editorial",
    icon: Sparkles,
    title: "Editorial",
    category: "Formulário",
    description: "Tipografia elegante, botão arredondado e apenas um formulário de registo.",
  },
  {
    id: "spin",
    icon: Gift,
    title: "Gire e ganhe",
    category: "Gamificado",
    description: "Registo seguido de roleta com prémios. O giro é a recompensa.",
  },
  {
    id: "scratch",
    icon: PartyPopper,
    title: "Raspadinha",
    category: "Gamificado",
    description: "A pessoa raspa, vê o prémio e deixa os dados para o resgatar.",
  },
  {
    id: "vip",
    icon: Heart,
    title: "Lista VIP",
    category: "Formulário",
    description: "Faixa discreta com um único campo: o WhatsApp. Ideal para lançamentos.",
  },
  {
    id: "birthday",
    icon: Cake,
    title: "Aniversário",
    category: "Formulário",
    description: "Duas etapas: nome e WhatsApp, depois e-mail e data de nascimento.",
  },
];

export const MESSAGE_MODELS: GalleryModel[] = [
  {
    id: "m-welcome",
    icon: MessageSquareText,
    title: "Boas-vindas",
    category: "Utilidade",
    meta: "Português (pt)",
    description: "Primeira resposta a quem escreve pela primeira vez.",
    preview: "Olá {{nome}}, obrigado por contactar {{negocio}}. Como podemos ajudar?",
  },
  {
    id: "m-order",
    icon: ShoppingBag,
    title: "Confirmação de pedido",
    category: "Utilidade",
    meta: "Português (pt)",
    description: "Confirma o pedido e indica o valor e o prazo.",
    preview: "O seu pedido {{numero}} foi recebido. Total: {{valor}}.",
  },
  {
    id: "m-reminder",
    icon: CalendarClock,
    title: "Lembrete de marcação",
    category: "Utilidade",
    meta: "Português (pt)",
    description: "Lembra data e hora de uma marcação.",
    preview: "Olá {{nome}}, a sua marcação é {{data}} às {{hora}}.",
  },
  {
    id: "m-offer",
    icon: Gift,
    title: "Oferta com código",
    category: "Marketing",
    meta: "Português (pt)",
    description: "Campanha promocional com código de desconto.",
    preview: "{{nome}}, use o código {{codigo}} e tenha desconto na sua próxima compra.",
  },
  {
    id: "m-reactivation",
    icon: Heart,
    title: "Reativação de cliente",
    category: "Marketing",
    meta: "Português (pt)",
    description: "Reaproxima clientes que não compram há algum tempo.",
    preview: "Olá {{nome}}, sentimos a sua falta. Temos novidades para si!",
  },
];
