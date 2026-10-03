import type { GalleryModel } from "@/components/dashboard/marketing/model-gallery";

// Modelos prontos: texto e estrutura de partida. Nada disto é enviado sem o cliente rever e ativar.

export const POPUP_MODELS: GalleryModel[] = [
  {
    id: "editorial",
    icon: "Sparkles",
    title: "Editorial",
    category: "Formulário",
    description: "Tipografia elegante, botão arredondado e apenas um formulário de registo.",
  },
  {
    id: "spin",
    icon: "Gift",
    title: "Gire e ganhe",
    category: "Gamificado",
    description: "Registo seguido de roleta com prémios. O giro é a recompensa.",
  },
  {
    id: "scratch",
    icon: "PartyPopper",
    title: "Raspadinha",
    category: "Gamificado",
    description: "A pessoa raspa, vê o prémio e deixa os dados para o resgatar.",
  },
  {
    id: "vip",
    icon: "Heart",
    title: "Lista VIP",
    category: "Formulário",
    description: "Faixa discreta com um único campo: o WhatsApp. Ideal para lançamentos.",
  },
  {
    id: "birthday",
    icon: "Cake",
    title: "Aniversário",
    category: "Formulário",
    description: "Duas etapas: nome e WhatsApp, depois e-mail e data de nascimento.",
  },
];
