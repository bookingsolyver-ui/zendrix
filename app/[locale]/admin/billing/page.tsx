import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Pill, Section, Stat, TABLE, TD, TH, dateOnly, dateTime, subTone } from "@/components/admin/ui";
import { loadBilling } from "@/lib/admin/queries";
import { SUB_STATUS_LABEL, shortId } from "@/lib/admin/schema";

export default async function AdminBillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const b = await loadBilling();
  const n = (value: number) => value.toLocaleString("pt-PT");

  return (
    <>
      <DashboardPageHeader title="Subscrições e pagamentos" subtitle="O estado da faturação (Stripe) e das vendas das empresas (Stripe Connect)." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Com subscrição no Stripe" value={n(b.withSub)} />
        <Stat label="Em atraso" value={n(b.pastDue)} tone={b.pastDue > 0 ? "bad" : "good"} />
        <Stat label="Contas Stripe Connect" value={n(b.connect)} hint="Empresas que ligaram a sua conta" />
        <Stat label="Último evento de faturação" value={b.lastBillingEvent ? dateTime.format(b.lastBillingEvent) : "—"} hint="Recebido pelo webhook do Stripe" />
      </div>

      <Section title="Pagamentos de clientes finais (Stripe Connect)">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Links criados (7 d)" value={n(b.links.created7d)} />
          <Stat label="Pagos (7 d)" value={n(b.links.paid7d)} tone="good" />
          <Stat label="Por pagar (total)" value={n(b.links.byStatus.OPEN ?? 0)} />
          <Stat label="Expirados (total)" value={n(b.links.byStatus.EXPIRED ?? 0)} />
        </div>
        <p className="mt-3 text-xs text-white/40">O dinheiro fica na conta Stripe de cada empresa. A Zetrix só regista o estado de cada link.</p>
      </Section>

      <Section title="Testes a terminar nos próximos 3 dias">
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Organização</th>
                <th className={TH}>E-mail do dono</th>
                <th className={TH}>Termina</th>
              </tr>
            </thead>
            <tbody>
              {b.expiring.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                  <td className={TD}>
                    <Link href={`/admin/organizations/${row.id}`} className="hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className={`${TD} text-white/60`}>{row.ownerEmail ?? "—"}</td>
                  <td className={`${TD} text-white/60`}>{row.trialEndsAt ? dateTime.format(row.trialEndsAt) : "—"}</td>
                </tr>
              ))}
              {b.expiring.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-white/40">
                    Nenhum teste a terminar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Subscrições">
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Organização</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Cliente Stripe</th>
                <th className={TH}>Subscrição Stripe</th>
                <th className={TH}>Último evento</th>
              </tr>
            </thead>
            <tbody>
              {b.subscribed.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                  <td className={TD}>
                    <Link href={`/admin/organizations/${row.id}`} className="hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone={subTone(row.subStatus)}>{SUB_STATUS_LABEL[row.subStatus] ?? row.subStatus}</Pill>
                      {row.blockedAt && <Pill tone="bad">Suspensa</Pill>}
                    </div>
                  </td>
                  <td className={`${TD} font-mono text-xs text-white/60`}>{shortId(row.stripeCustomerId)}</td>
                  <td className={`${TD} font-mono text-xs text-white/60`}>{shortId(row.stripeSubscriptionId)}</td>
                  <td className={`${TD} text-white/60`}>{row.stripeEventAt ? dateOnly.format(row.stripeEventAt) : "—"}</td>
                </tr>
              ))}
              {b.subscribed.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Ainda não há subscrições.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40">O painel mostra o que a base de dados guarda dos eventos do Stripe (estado e data do último). Para o registo bruto de cada webhook, use o painel de programadores do Stripe.</p>
      </Section>
    </>
  );
}
