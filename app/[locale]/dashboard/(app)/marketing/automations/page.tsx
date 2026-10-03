import { setRequestLocale } from "next-intl/server";
import { CalendarHeart, CreditCard, Plus, ShoppingBag, UserPlus, Workflow } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { FilterBar } from "@/components/dashboard/marketing/filter-bar";
import { HowItWorks } from "@/components/dashboard/marketing/how-it-works";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { ModelGallery } from "@/components/dashboard/marketing/model-gallery";
import { StarterGrid } from "@/components/dashboard/marketing/starter-grid";
import { AutomationList } from "@/components/dashboard/marketing/automation-list";
import { AUTOMATION_MODELS } from "@/components/dashboard/marketing/models-data";
import { INITIAL_AUTOMATIONS } from "@/components/dashboard/marketing/automations-data";
import { SoonButton } from "@/components/ui/soon-button";

const TRIGGERS = [
  { icon: ShoppingBag, title: "Carrinho abandonado", description: "Requer uma loja ligada que envie este evento." },
  { icon: CreditCard, title: "Pagamento confirmado", description: "Dispara quando um link de pagamento é pago." },
  { icon: UserPlus, title: "Novo contacto", description: "Dispara quando alguém escreve pela primeira vez." },
  { icon: CalendarHeart, title: "Data do contacto", description: "Chegou uma data do contacto: aniversário, renovação, vencimento." },
];

export default async function MarketingAutomationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Automações"
        subtitle="Automatize jornadas de mensagens disparadas por eventos do cliente."
        action={
          <SoonButton
            feature="Nova automação"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Nova automação
          </SoonButton>
        }
      />

      <div className="space-y-8">
        <section className="space-y-4">
          <FilterBar filters={["Últimos 30 dias", "Qualquer tipo", "Qualquer estado"]} />
          {INITIAL_AUTOMATIONS.length === 0 ? (
            <MarketingEmptyState
              icon={Workflow}
              title="Ainda não tem automações"
              description="Os fluxos reagem a um evento do cliente e enviam o seguimento por si, a qualquer hora."
            />
          ) : (
            <AutomationList />
          )}
        </section>

        <HowItWorks
          steps={[
            "Comece por um evento: carrinho abandonado, pedido, novo contacto",
            "Envie automaticamente um template aprovado",
            "Ramifique com condições, filtros e esperas",
            "Acompanhe envios e cliques por fluxo",
          ]}
        />

        <StarterGrid
          title="Comece por um gatilho"
          subtitle="A automação nasce com o gatilho já escolhido e o editor abre com ele no lugar."
          options={TRIGGERS}
        />

        <ModelGallery
          title="Modelos prontos"
          subtitle="Jornadas completas, com as mensagens já escritas. Reveja tudo antes de ativar."
          models={AUTOMATION_MODELS}
          action="Usar este modelo"
        />
      </div>
    </>
  );
}
