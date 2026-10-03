import { setRequestLocale } from "next-intl/server";
import { CalendarClock, FlaskConical, Megaphone, Plus, Send, Timer } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { StarterGrid } from "@/components/dashboard/marketing/starter-grid";
import { FilterBar } from "@/components/dashboard/marketing/filter-bar";
import { HowItWorks } from "@/components/dashboard/marketing/how-it-works";
import { CampaignsTable } from "@/components/dashboard/marketing/campaigns/campaigns-table";
import { SoonButton } from "@/components/ui/soon-button";

const CAMPAIGN_TYPES = [
  { icon: Send, title: "Campanha padrão", description: "Um template aprovado para um público, agora ou agendada." },
  { icon: FlaskConical, title: "Teste A/B de conteúdo", description: "Dois ou mais templates para uma amostra; o vencedor segue para os restantes." },
  { icon: Timer, title: "Teste A/B de horário", description: "O mesmo template em horas diferentes, para descobrir quando o seu público lê." },
  { icon: CalendarClock, title: "Agendada", description: "Deixe tudo pronto hoje e dispare na data e hora que escolher." },
];

export default async function CampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Campanhas"
        subtitle="Envie e meça campanhas de WhatsApp."
        action={
          <SoonButton
            feature="Nova campanha"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Nova campanha
          </SoonButton>
        }
      />

      <div className="space-y-8">
        <MarketingHero
          icon={Megaphone}
          title="Campanhas de WhatsApp"
          description="Uma mensagem para muitos contactos, com template aprovado pela Meta. Escolha o público, veja a mensagem como o cliente a vai ver e agende ou envie logo."
          bullets={[
            "Segmentos e listas com contagem de contactos",
            "Teste A/B de conteúdo ou de horário",
            "Leitura e cliques na mesma página",
          ]}
          cta="Nova campanha"
        />

        <StarterGrid
          title="Comece por um tipo"
          subtitle="Cada atalho abre o editor já configurado. Pode mudar tudo depois."
          options={CAMPAIGN_TYPES}
        />

        <section className="space-y-4">
          <FilterBar filters={["Últimos 30 dias", "Qualquer estado"]} />
          <CampaignsTable />
        </section>

        <HowItWorks
          steps={[
            "Selecione um template aprovado",
            "Segmente os contactos por etiquetas",
            "Agende o envio para a melhor hora",
            "Acompanhe as taxas de entrega e leitura",
          ]}
        />
      </div>
    </>
  );
}
