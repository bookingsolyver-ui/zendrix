import { setRequestLocale } from "next-intl/server";
import { BookOpenCheck, FileText, FolderOpen, ScrollText, Users } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DocsManager, type DocView } from "@/components/dashboard/crm/docs/docs-manager";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const FEATURES = [
  { icon: ScrollText, title: "Guiões de atendimento", description: "Respostas e procedimentos escritos uma vez e consultados por toda a equipa." },
  { icon: BookOpenCheck, title: "Políticas e regras", description: "Trocas, devoluções, prazos e condições sempre à mão durante o atendimento." },
  { icon: FolderOpen, title: "Tudo num só sítio", description: "Notas internas e documentos de apoio organizados por título." },
  { icon: Users, title: "Partilha com a equipa", description: "Todos veem a versão atual e sabem quem a editou por último." },
];

const dateFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" });

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const rows = user?.workspace
    ? await prisma.doc.findMany({ where: { workspaceId: user.workspace.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, body: true, updatedAt: true, lastEditedBy: true } })
    : [];
  const docs: DocView[] = rows.map((row) => ({ id: row.id, title: row.title, body: row.body, updatedLabel: dateFormat.format(row.updatedAt), editor: row.lastEditedBy }));
  const canDelete = user?.role === "OWNER" || user?.role === "MANAGER";

  return (
    <>
      <DashboardPageHeader title="Documentos" subtitle="Guiões, políticas e notas partilhadas com a equipa." />

      <div className="space-y-8">
        <MarketingHero
          icon={FileText}
          title="A base de conhecimento da equipa"
          description="Reúna num só sítio o que a equipa precisa de saber para atender bem: guiões, políticas e notas internas."
          bullets={["Um lugar único para guiões e políticas", "Sempre a versão mais recente", "Visível para toda a equipa"]}
        />

        <DocsManager docs={docs} canDelete={canDelete} />

        <FeatureGrid title="Como funciona" features={FEATURES} />
      </div>
    </>
  );
}
