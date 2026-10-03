import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { Clock, Globe, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { PopupsManager, type PopupView } from "@/components/dashboard/marketing/popups-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { publicOrigin } from "@/lib/http/public-url";
import { parsePopupConfig } from "@/lib/popups/schema";
import { prisma } from "@/lib/prisma";

const FEATURES = [
  { icon: Zap, title: "Um só código", description: "Cole o script uma vez no site. Ligar, desligar ou editar o popup não exige mexer no código outra vez." },
  { icon: Clock, title: "Quando mostrar", description: "Após alguns segundos ou quando o visitante vai a sair. Quem fecha ou se regista não volta a ser incomodado durante uns dias." },
  { icon: Globe, title: "Só nos seus sites", description: "Pode limitar o popup aos seus domínios, para ninguém mais o conseguir usar." },
  { icon: ShieldCheck, title: "Consentimento guardado", description: "Cada registo guarda o texto de consentimento aceite. O contacto entra na sua lista e dispara as automações." },
];

export default async function PopupsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";

  // O endereço que vai no script: o público configurado, ou o do próprio pedido.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const origin = publicOrigin() ?? `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;

  const rows = workspaceId ? await prisma.popup.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }) : [];
  const counts = workspaceId && rows.length ? await prisma.popupSubmission.groupBy({ by: ["popupId"], where: { workspaceId }, _count: { _all: true } }) : [];

  const popups: PopupView[] = rows.flatMap((row) => {
    const config = parsePopupConfig(row.config);
    if (!config) return [];
    // O código para colar só vai para quem gere.
    return [{ id: row.id, name: row.name, active: row.active, embedUrl: canManage ? `${origin}/api/embed/${row.publicKey}.js` : "", views: row.views, submissions: counts.find((c) => c.popupId === row.id)?._count._all ?? 0, config }];
  });

  return (
    <>
      <DashboardPageHeader title="Popups" subtitle="Capte contactos no seu site e leve-os direto para a sua lista." />
      <div className="space-y-8">
        <MarketingHero
          icon={Sparkles}
          title="Popups de captura"
          description="Crie um popup, cole um código no seu site e transforme visitantes em contactos. Cada registo entra na sua base e pode disparar uma automação."
          bullets={["Formulário com telemóvel, nome e e-mail", "Aparece após um tempo ou quando o visitante vai a sair", "Visualizações e registos em tempo real"]}
        />
        <PopupsManager popups={popups} canManage={canManage} />
        <FeatureGrid title="Como funciona" features={FEATURES} />
      </div>
    </>
  );
}
