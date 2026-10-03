import { setRequestLocale } from "next-intl/server";
import { CalendarClock, Clock, Gauge, Megaphone, ShieldCheck } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { CampaignsManager, type CampaignView, type SegmentOption } from "@/components/dashboard/marketing/campaigns-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCampaigns } from "@/lib/campaigns/engine";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_SEGMENTS } from "@/lib/segments/builtin";
import { parseRules, rulesToFilter } from "@/lib/segments/rules";

const FEATURES = [
  { icon: Clock, title: "Janela de 24 horas", description: "Só recebe quem escreveu nas últimas 24 h, como a Meta exige. Os restantes são ignorados e contados." },
  { icon: CalendarClock, title: "Agora ou agendada", description: "Envie já ou escolha o dia e a hora. A audiência calcula-se no momento do envio." },
  { icon: Gauge, title: "Envio com ritmo", description: "As mensagens saem pela fila de saída, com ritmo controlado para proteger o seu número." },
  { icon: ShieldCheck, title: "Quem pede para parar, para", description: "Contactos que pediram para não receber mensagens automáticas nunca entram numa campanha." },
];

const dateFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
const nowDate = () => new Date();

export default async function CampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const now = nowDate();

  const rows = workspaceId ? await listCampaigns(workspaceId) : [];
  const custom = workspaceId ? await prisma.segment.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, rules: true } }) : [];

  const defs = [
    ...BUILT_IN_SEGMENTS.map((segment) => ({ value: `builtin:${segment.key}`, label: segment.name, rules: segment.rules })),
    ...custom.map((segment) => ({ value: `custom:${segment.id}`, label: segment.name, rules: parseRules(segment.rules) })),
  ];
  const counts = workspaceId ? await Promise.all(defs.map((def) => prisma.contact.count({ where: { workspaceId, ...rulesToFilter(def.rules, now) } }))) : defs.map(() => 0);
  const segments: SegmentOption[] = defs.map((def, index) => ({ value: def.value, label: def.label, members: counts[index] }));

  const templates = workspaceId && canManage ? await prisma.messageTemplate.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, select: { id: true, name: true, body: true } }) : [];

  const campaigns: CampaignView[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    segmentName: row.segmentName,
    message: row.message,
    status: row.status,
    scheduledLabel: dateFormat.format(row.scheduledAt),
    counters: row.counters,
    skipped: row.skipped,
  }));

  return (
    <>
      <DashboardPageHeader title="Campanhas" subtitle="Envie uma mensagem a um segmento de contactos e acompanhe os resultados." />
      <div className="space-y-8">
        <MarketingHero
          icon={Megaphone}
          title="Campanhas de WhatsApp"
          description="Escolha um segmento, escreva a mensagem e envie agora ou agende. Os números de envio, entrega e leitura vêm do próprio WhatsApp."
          bullets={["Segmentos predefinidos e os seus", "Envio imediato ou agendado", "Entregues e lidas em tempo real"]}
        />
        <CampaignsManager campaigns={campaigns} segments={segments} templates={templates} canManage={canManage} />
        <FeatureGrid title="Como funciona" features={FEATURES} />
      </div>
    </>
  );
}
