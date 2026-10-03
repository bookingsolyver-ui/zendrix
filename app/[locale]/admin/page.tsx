import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Pill, Section, Stat, money } from "@/components/admin/ui";
import { configChecks, loadOverview } from "@/lib/admin/queries";

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const o = await loadOverview();
  const checks = configChecks();
  const n = (value: number) => value.toLocaleString("pt-PT");

  return (
    <>
      <DashboardPageHeader title="Visão geral da plataforma" subtitle="Os números de todas as organizações, em tempo real." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Organizações" value={n(o.orgs)} hint={`${n(o.byStatus.active)} ativas · ${n(o.byStatus.trialing)} em teste`} />
        <Stat label="Utilizadores" value={n(o.users)} />
        <Stat label="Contactos" value={n(o.contacts)} />
        <Stat label="Suspensas" value={n(o.blocked)} tone={o.blocked > 0 ? "warn" : "default"} />
        <Stat label="Aguardam aprovação" value={n(o.pendingApprovals)} tone={o.pendingApprovals > 0 ? "warn" : "default"} hint="Contas novas por rever" />
        <Stat label="Mensagens enviadas (24 h)" value={n(o.messages24h.out)} hint={`${n(o.messages24h.in)} recebidas`} />
        <Stat label="Subscrições ativas" value={n(o.activeSubs)} hint="Ativas e ligadas ao Stripe" tone="good" />
        <Stat label="Receita mensal estimada" value={o.mrr ? money(o.mrr.amountMinor, o.mrr.currency) : "Indisponível"} hint={o.mrr ? "Subscrições ativas × preço do plano" : "Não foi possível ler o preço no Stripe"} />
        <Stat label="Em atraso" value={n(o.byStatus.past_due)} tone={o.byStatus.past_due > 0 ? "bad" : "default"} hint={`${n(o.byStatus.canceled)} canceladas`} />
      </div>

      <Section title="Infraestrutura">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Fila de saída: pendentes" value={n(o.outbox.pending)} hint={o.outbox.pending > 0 ? `A mais antiga espera há ${o.outbox.oldestPendingMinutes} min` : "Fila vazia"} tone={o.outbox.oldestPendingMinutes > 15 ? "bad" : "default"} />
          <Stat label="Fila de saída: em envio" value={n(o.outbox.processing)} />
          <Stat label="Envios falhados (24 h)" value={n(o.outbox.failed24h)} tone={o.outbox.failed24h > 0 ? "warn" : "good"} />
          <Stat label="Canais com problema" value={n(o.integrations.problem)} hint={`${n(o.integrations.active)} ativos`} tone={o.integrations.problem > 0 ? "warn" : "good"} />
          <Stat label="Campanhas" value={n(o.campaigns.sending)} hint={`a enviar · ${n(o.campaigns.scheduled)} agendadas`} />
          <Stat label="Automações ativas" value={n(o.automations)} />
          <Stat label="Popups ativos" value={n(o.popups)} />
          <Stat label="Pedidos de eliminação" value={n(o.pendingDeletions)} hint="Por concluir" tone={o.pendingDeletions > 0 ? "warn" : "good"} />
        </div>
        <p className="mt-3 text-xs text-white/40">Uma fila com pendentes há mais de 15 minutos costuma indicar que o cron (o workflow do GitHub) não está a correr.</p>
      </Section>

      <Section title="Configuração do servidor">
        <div className="glow-border grid gap-px overflow-hidden rounded-2xl sm:grid-cols-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between gap-3 bg-black/20 px-5 py-3 text-sm">
              <span className="text-white/70">{check.label}</span>
              <Pill tone={check.ok ? "good" : "bad"}>{check.ok ? "Configurado" : "Em falta"}</Pill>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">Só se mostra se está definido, nunca o valor.</p>
      </Section>
    </>
  );
}
