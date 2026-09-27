export type SegmentTier = "green" | "blue" | "amber" | "dormant";

export type RfmSegment = {
  id: string;
  name: string;
  tier: SegmentTier;
  customers: number;
  revenue90d: string;
  tip: string;
  span: "wide" | "normal";
};

export const TIER_STYLES: Record<
  SegmentTier,
  { bg: string; border: string; text: string; dot: string }
> = {
  green: {
    bg: "bg-rfm-green/10",
    border: "border-rfm-green/30",
    text: "text-emerald-400",
    dot: "bg-rfm-green",
  },
  blue: {
    bg: "bg-rfm-blue/10",
    border: "border-rfm-blue/30",
    text: "text-blue-400",
    dot: "bg-rfm-blue",
  },
  amber: {
    bg: "bg-rfm-amber/10",
    border: "border-rfm-amber/30",
    text: "text-amber-400",
    dot: "bg-rfm-amber",
  },
  dormant: {
    bg: "bg-rfm-dormant/10",
    border: "border-rfm-dormant/30",
    text: "text-[#8688c9]",
    dot: "bg-rfm-dormant",
  },
};

export const RFM_SEGMENTS: RfmSegment[] = [
  {
    id: "campeoes",
    name: "Campeões",
    tier: "green",
    customers: 1204,
    revenue90d: "Kz 15.000.000",
    tip: "Trate como VIP — recompense com exclusividade e acesso antecipado.",
    span: "wide",
  },
  {
    id: "fieis",
    name: "Fiéis",
    tier: "green",
    customers: 2310,
    revenue90d: "Kz 9.800.000",
    tip: "Recompense a lealdade com um programa de pontos e ofertas exclusivas.",
    span: "normal",
  },
  {
    id: "promissores",
    name: "Promissores",
    tier: "blue",
    customers: 1860,
    revenue90d: "Kz 3.200.000",
    tip: "Incentive a segunda compra com uma oferta personalizada e feedback ativo.",
    span: "normal",
  },
  {
    id: "precisam-atencao",
    name: "Precisam de atenção",
    tier: "blue",
    customers: 1540,
    revenue90d: "Kz 1.750.000",
    tip: "Reative com uma campanha direcionada antes que percam o interesse.",
    span: "normal",
  },
  {
    id: "em-risco",
    name: "Em Risco",
    tier: "amber",
    customers: 1920,
    revenue90d: "Kz 2.450.000",
    tip: "Aja rápido — envie um desconto exclusivo antes que mudem para a concorrência.",
    span: "normal",
  },
  {
    id: "hibernando",
    name: "Hibernando",
    tier: "dormant",
    customers: 2150,
    revenue90d: "Kz 890.000",
    tip: "Tente reativar com uma campanha de win-back e um incentivo forte.",
    span: "wide",
  },
  {
    id: "perdidos",
    name: "Perdidos",
    tier: "dormant",
    customers: 1466,
    revenue90d: "Kz 210.000",
    tip: "Considere uma última campanha de reconquista ou remova da lista ativa.",
    span: "normal",
  },
];

export const TOTAL_CUSTOMERS = RFM_SEGMENTS.reduce((sum, segment) => sum + segment.customers, 0);
