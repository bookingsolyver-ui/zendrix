import { setRequestLocale } from "next-intl/server";
import { Eye, MousePointerClick, Percent, Plus, Power, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { ModelGallery } from "@/components/dashboard/marketing/model-gallery";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { PopupCard } from "@/components/dashboard/marketing/popups/popup-card";
import { STORE_POPUPS } from "@/components/dashboard/marketing/popups/popups-data";
import { POPUP_MODELS } from "@/components/dashboard/marketing/models-data";
import { SoonButton } from "@/components/ui/soon-button";

const STATS = [
  { icon: Power, label: "Ativos", value: String(STORE_POPUPS.filter((popup) => popup.status === "active").length) },
  { icon: Eye, label: "Visualizações", value: "0" },
  { icon: MousePointerClick, label: "Registos", value: "0" },
  { icon: Percent, label: "Taxa de registo", value: "—" },
];

export default async function PopupsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Popups"
        subtitle="Capte contactos na sua loja com roleta, raspadinha e formulários."
        action={
          <SoonButton
            feature="Criar popup"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Criar popup
          </SoonButton>
        }
      />

      <div className="space-y-8">
        <MarketingHero
          icon={Sparkles}
          title="Popups na loja"
          description="Transforme visitantes em contactos. Escolha entre roleta, raspadinha ou um simples formulário e personalize o aspeto."
          bullets={[
            "Roleta, raspadinha ou só formulário",
            "Cores, textos e imagens à sua medida",
            "Cada registo entra na sua lista de contactos",
          ]}
          cta="Criar popup"
        />

        <ModelGallery
          title="Comece por um modelo"
          subtitle="Escolha um modelo, dê-lhe um nome e ajuste tudo no editor."
          models={POPUP_MODELS}
          action="Usar este modelo"
        />

        <section>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((stat) => {
              const Icon = stat.icon;

              return (
                <div key={stat.label} className="glow-border rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{stat.label}</span>
                    <Icon className="h-4 w-4 text-neon-green" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Os seus popups</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Clique num popup para o editar. Os números somam todo o período.</p>
          {STORE_POPUPS.length === 0 ? (
            <MarketingEmptyState
              icon={Sparkles}
              title="Ainda não tem popups"
              description="Crie um popup de roleta ou raspadinha para transformar visitantes em contactos."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {STORE_POPUPS.map((popup) => (
                <PopupCard key={popup.id} popup={popup} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
