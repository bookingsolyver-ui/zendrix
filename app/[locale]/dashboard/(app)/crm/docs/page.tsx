import { setRequestLocale } from "next-intl/server";
import { BookOpenCheck, FileText, FolderOpen, Plus, ScrollText, Users } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DocCard } from "@/components/dashboard/crm/docs/doc-card";
import { DOCS } from "@/components/dashboard/crm/docs/docs-data";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { SoonButton } from "@/components/ui/soon-button";

const FEATURES = [
  { icon: ScrollText, title: "Guiões de atendimento", description: "Respostas e procedimentos escritos uma vez e consultados por toda a equipa." },
  { icon: BookOpenCheck, title: "Políticas e regras", description: "Trocas, devoluções, prazos e condições sempre à mão durante o atendimento." },
  { icon: FolderOpen, title: "Organização por pastas", description: "Agrupe os documentos por tema, equipa ou cliente." },
  { icon: Users, title: "Partilha com a equipa", description: "Todos veem a versão atual e sabem quem a editou por último." },
];

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Documentos"
        subtitle="Guiões, políticas e notas partilhadas com a equipa."
        action={
          <SoonButton
            feature="Novo documento"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Novo documento
          </SoonButton>
        }
      />

      <div className="space-y-8">
        <MarketingHero
          icon={FileText}
          title="A base de conhecimento da equipa"
          description="Reúna num só sítio o que a equipa precisa de saber para atender bem: guiões, políticas e notas internas."
          bullets={[
            "Um lugar único para guiões e políticas",
            "Sempre a versão mais recente",
            "Visível para toda a equipa",
          ]}
          cta="Novo documento"
        />

        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">Os seus documentos</h2>
          {DOCS.length === 0 ? (
            <MarketingEmptyState
              icon={FileText}
              title="Ainda não tem documentos"
              description="Os documentos e guiões partilhados com a sua equipa vão aparecer aqui."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DOCS.map((doc) => (
                <DocCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </section>

        <FeatureGrid title="O que vai poder fazer" features={FEATURES} />
      </div>
    </>
  );
}
