import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { OrgActions } from "@/components/admin/org-actions";
import { Pill, Section, Stat, TABLE, TD, TH, dateOnly, dateTime, subTone } from "@/components/admin/ui";
import { getPlatformAdmin, logOrganizationView } from "@/lib/admin/guard";
import { loadOrganization } from "@/lib/admin/queries";
import { SUB_STATUS_LABEL, maskPhone, shortId } from "@/lib/admin/schema";
import { CAMPAIGN_STATUS_LABEL, type CampaignStatusValue } from "@/lib/campaigns/schema";
import { LEAD_STAGE_LABEL, type LeadStageName } from "@/lib/leads/lead";
import { idSchema } from "@/lib/validations/team";

export default async function AdminOrganizationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!idSchema.safeParse(id).success) notFound();
  const data = await loadOrganization(id);
  if (!data) notFound();
  const { workspace: w } = data;

  const admin = await getPlatformAdmin();
  if (admin) await logOrganizationView(admin, id);

  const n = (value: number) => value.toLocaleString("pt-PT");
  const paid = data.payments.PAID ?? 0;

  return (
    <>
      <DashboardPageHeader title={w.name} subtitle={`Criada em ${dateOnly.format(w.createdAt)} · ${w.ownerEmail ?? "sem e-mail do dono"} · ${w.id}`} />

      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone={subTone(w.subStatus, w.blockedAt !== null)}>{w.blockedAt ? "Suspensa" : (SUB_STATUS_LABEL[w.subStatus] ?? w.subStatus)}</Pill>
        {w.plan && <Pill>{w.plan}</Pill>}
        {w.subStatus === "trialing" && w.trialEndsAt && <Pill tone="warn">Teste até {dateOnly.format(w.trialEndsAt)}</Pill>}
        <Pill tone={w.agentEnabled ? "good" : "default"}>{w.agentEnabled ? "IA ligada" : "IA desligada"}</Pill>
        {w.approvalStatus === "PENDING_APPROVAL" && <Pill tone="warn">Por aprovar</Pill>}
        {w.approvalStatus === "REJECTED" && <Pill tone="bad">Rejeitada</Pill>}
        <Link href={`/admin/organizations/${w.id}/diagnostics`} className="ml-auto rounded-full border border-emerald-500/40 px-4 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10">
          Diagnóstico
        </Link>
        <Link href="/admin/organizations" className="py-1.5 text-sm text-white/50 hover:text-white">
          ← Todas as organizações
        </Link>
      </div>

      <OrgActions id={w.id} name={w.name} blocked={w.blockedAt !== null} blockedReason={w.blockedReason} subStatus={w.subStatus} plan={w.plan} hasStripeSubscription={Boolean(w.stripeSubscriptionId)} approvalStatus={w.approvalStatus} />

      <Section title="Consumo">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Mensagens enviadas (7 d)" value={n(data.usage.out7)} />
          <Stat label="Mensagens enviadas (30 d)" value={n(data.usage.out30)} hint={`${n(data.usage.in30)} recebidas`} />
          <Stat label="Contactos" value={n(data.contactCount)} />
          <Stat label="Fila de saída" value={n((data.outbox.PENDING ?? 0) + (data.outbox.PROCESSING ?? 0))} hint={`${n(data.outbox.FAILED ?? 0)} falhadas · ${n(data.outbox.SENT ?? 0)} enviadas`} tone={(data.outbox.FAILED ?? 0) > 0 ? "warn" : "default"} />
          <Stat label="Automações" value={n(data.automations.active)} hint={`ativas · ${n(data.automations.inactive)} desligadas`} />
          <Stat label="Popups" value={n(data.popups.active)} hint={`ativos · ${n(data.popups.inactive)} desligados`} />
          <Stat label="Pagamentos recebidos" value={n(paid)} hint={`${n(data.payments.OPEN ?? 0)} links por pagar`} />
          <Stat label="Chaves de API" value={n(data.apiKeys.filter((key) => !key.revokedAt).length)} hint="Ativas" />
        </div>
      </Section>

      <Section title="Subscrição e pagamentos">
        <dl className="glow-border grid gap-px overflow-hidden rounded-2xl text-sm sm:grid-cols-2">
          {[
            ["Cliente Stripe", shortId(w.stripeCustomerId)],
            ["Subscrição Stripe", shortId(w.stripeSubscriptionId)],
            ["Conta Stripe Connect (vendas da empresa)", w.stripeConnectAccountId ? shortId(w.stripeConnectAccountId) : "Não ligada"],
            ["Último evento de faturação", w.stripeEventAt ? dateTime.format(w.stripeEventAt) : "—"],
            [w.cancelAtPeriodEnd ? "Acesso até (cancelada no fim do período)" : "Próxima renovação", w.periodEnd ? dateOnly.format(w.periodEnd) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 bg-black/20 px-5 py-3">
              <dt className="text-white/50">{label}</dt>
              <dd className="font-mono text-xs text-white/80">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={`Membros (${data.members.length})`}>
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>E-mail</th>
                <th className={TH}>Nome</th>
                <th className={TH}>Papel</th>
                <th className={TH}>Desde</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.id} className="border-b border-white/5 last:border-b-0">
                  <td className={TD}>{member.email}</td>
                  <td className={`${TD} text-white/60`}>{member.name ?? "—"}</td>
                  <td className={TD}>
                    <Pill>{member.role === "OWNER" ? "Proprietário" : member.role === "MANAGER" ? "Gestor" : "Agente"}</Pill>
                  </td>
                  <td className={`${TD} text-white/60`}>{dateOnly.format(member.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Canais">
        <div className="flex flex-wrap gap-2">
          {data.integrations.length === 0 && <p className="text-sm text-white/40">Nenhum canal ligado.</p>}
          {data.integrations.map((integration) => (
            <Pill key={integration.platform} tone={integration.status === "ACTIVE" ? "good" : "warn"}>
              {integration.platform} · {integration.status === "ACTIVE" ? "Ativo" : integration.status}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Campanhas recentes">
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Nome</th>
                <th className={TH}>Estado</th>
                <th className={`${TH} text-right`}>Destinatários</th>
                <th className={TH}>Data</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-white/5 last:border-b-0">
                  <td className={TD}>{campaign.name}</td>
                  <td className={TD}>
                    <Pill>{CAMPAIGN_STATUS_LABEL[campaign.status as CampaignStatusValue]}</Pill>
                  </td>
                  <td className={`${TD} text-right`}>{n(campaign.totalRecipients)}</td>
                  <td className={`${TD} text-white/60`}>{dateTime.format(campaign.scheduledAt)}</td>
                </tr>
              ))}
              {data.campaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/40">
                    Sem campanhas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Contactos mais recentes">
        <p className="mb-3 text-xs text-white/40">Os números aparecem truncados: o administrador vê que existem, não o contacto completo. O acesso a esta página fica registado.</p>
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Nome</th>
                <th className={TH}>Telemóvel</th>
                <th className={TH}>Canal</th>
                <th className={TH}>Fase</th>
                <th className={TH}>Criado</th>
              </tr>
            </thead>
            <tbody>
              {data.contactsSample.map((contact) => (
                <tr key={contact.id} className="border-b border-white/5 last:border-b-0">
                  <td className={TD}>{contact.name ?? "—"}</td>
                  <td className={`${TD} font-mono text-xs text-white/60`}>{maskPhone(contact.waId)}</td>
                  <td className={`${TD} text-white/60`}>{contact.platform}</td>
                  <td className={TD}>
                    <Pill>{LEAD_STAGE_LABEL[contact.leadStage as LeadStageName]}</Pill>
                  </td>
                  <td className={`${TD} text-white/60`}>{dateOnly.format(contact.createdAt)}</td>
                </tr>
              ))}
              {data.contactsSample.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Sem contactos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Ações de administração nesta organização">
        <ul className="glow-border divide-y divide-white/5 rounded-2xl text-sm">
          {data.audit.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span className="text-white/70">
                <span className="font-medium text-white">{entry.action}</span> · {entry.adminEmail}
              </span>
              <span className="text-xs text-white/40">{dateTime.format(entry.createdAt)}</span>
            </li>
          ))}
          {data.audit.length === 0 && <li className="px-5 py-6 text-center text-white/40">Sem registos.</li>}
        </ul>
      </Section>
    </>
  );
}
