import { setRequestLocale } from "next-intl/server";
import { Braces, FileCheck2, Languages, MessageSquareText } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { TemplatesManager, type TemplateView } from "@/components/dashboard/marketing/templates-list/templates-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { TEMPLATE_STARTERS } from "@/lib/templates/starters";

const FEATURES = [
  { icon: Braces, title: "Variáveis", description: "Use {{1}}, {{2}}... para o nome, o valor ou a data de cada pessoa." },
  { icon: Languages, title: "Vários idiomas", description: "Guarde o mesmo modelo em português, inglês ou espanhol." },
  { icon: FileCheck2, title: "Utilidade e marketing", description: "Separe as mensagens de serviço das promocionais, como o WhatsApp exige." },
  { icon: MessageSquareText, title: "Sempre à mão", description: "A equipa encontra aqui os textos certos para cada situação." },
];

export default async function TemplatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const rows = user?.workspace
    ? await prisma.messageTemplate.findMany({ where: { workspaceId: user.workspace.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, category: true, language: true, body: true } })
    : [];
  const templates: TemplateView[] = rows.map((row) => ({ ...row, category: row.category === "MARKETING" ? "MARKETING" : "UTILITY" }));

  return (
    <>
      <DashboardPageHeader title="Templates" subtitle="Biblioteca de modelos de mensagem do WhatsApp para a sua equipa." />

      <div className="space-y-8">
        <MarketingHero
          icon={MessageSquareText}
          title="Modelos de mensagem"
          description="Guarde os textos que a equipa usa com mais frequência. Para enviar mensagens fora da janela de 24 horas, o WhatsApp exige modelos aprovados pela Meta, que se submetem no WhatsApp Manager."
          bullets={["Variáveis como nome, valor ou data", "Categorias: utilidade e marketing", "Edição e organização por toda a equipa"]}
        />

        <TemplatesManager templates={templates} starters={TEMPLATE_STARTERS} canManage={user?.role === "OWNER" || user?.role === "MANAGER"} />

        <FeatureGrid title="Como funciona" features={FEATURES} />
      </div>
    </>
  );
}
