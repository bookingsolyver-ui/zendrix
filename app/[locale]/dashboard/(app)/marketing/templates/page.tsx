import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, Clock, FileEdit, GalleryHorizontal, MessageSquareText, Plus, Star, Tag, Timer } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { ModelGallery } from "@/components/dashboard/marketing/model-gallery";
import { StarterGrid } from "@/components/dashboard/marketing/starter-grid";
import { HowItWorks } from "@/components/dashboard/marketing/how-it-works";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { TemplateCard } from "@/components/dashboard/marketing/templates-list/template-card";
import { TEMPLATES } from "@/components/dashboard/marketing/templates-list/templates-data";
import { MESSAGE_MODELS } from "@/components/dashboard/marketing/models-data";
import { SoonButton } from "@/components/ui/soon-button";

const FORMATS = [
  { icon: MessageSquareText, title: "Padrão", description: "Texto, multimédia no cabeçalho e botões de resposta." },
  { icon: GalleryHorizontal, title: "Carrossel", description: "De 2 a 10 cartões deslizáveis com imagem ou vídeo." },
  { icon: Timer, title: "Oferta por tempo limitado", description: "Cupom com prazo e contagem decrescente na mensagem." },
  { icon: Star, title: "Pesquisa de satisfação", description: "Nota de 1 a 5 que o cliente envia num só toque." },
  { icon: Tag, title: "Pedido de avaliação", description: "Nota do produto, pedida depois da entrega." },
];

const count = (status: string) => TEMPLATES.filter((template) => template.status === status).length;

const STATS = [
  { icon: MessageSquareText, label: "Templates", value: TEMPLATES.length },
  { icon: CheckCircle2, label: "Aprovados", value: count("approved") },
  { icon: Clock, label: "Em análise", value: count("review") },
  { icon: FileEdit, label: "Rascunhos", value: 0 },
];

export default async function TemplatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Templates"
        subtitle="Modelos de mensagem aprovados pela Meta para campanhas e automações."
        action={
          <SoonButton
            feature="Novo template"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Novo template
          </SoonButton>
        }
      />

      <div className="space-y-8">
        <MarketingHero
          icon={MessageSquareText}
          title="Templates de WhatsApp"
          description="Fora da janela de 24 horas, o WhatsApp só permite mensagens a partir de templates aprovados. Crie os seus e acompanhe o estado da aprovação."
          bullets={[
            "Variáveis como nome, valor ou data",
            "Estado da aprovação: aprovado, em análise ou rejeitado",
            "Reutilize o mesmo template em campanhas e automações",
          ]}
          cta="Novo template"
        />

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        </section>

        <StarterGrid
          title="Comece por um formato"
          subtitle="Cada atalho abre o editor já configurado. Pode mudar tudo depois."
          options={FORMATS}
          columns="lg:grid-cols-5"
        />

        <section>
          <h2 className="text-base font-semibold text-foreground">Os seus templates</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Só os templates aprovados podem ser usados em envios.</p>
          {TEMPLATES.length === 0 ? (
            <MarketingEmptyState
              icon={MessageSquareText}
              title="Ainda não tem templates"
              description="Os seus templates de mensagem vão aparecer aqui, com o estado da aprovação."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </section>

        <ModelGallery
          title="Modelos de partida"
          subtitle="Textos prontos para adaptar. Submetidos à Meta, só ficam disponíveis depois de aprovados."
          models={MESSAGE_MODELS}
          action="Usar este modelo"
        />

        <HowItWorks
          steps={[
            "Escolha um modelo ou escreva do zero",
            "Defina as variáveis da mensagem",
            "Submeta para aprovação da Meta",
            "Use o template aprovado nos seus envios",
          ]}
        />
      </div>
    </>
  );
}
