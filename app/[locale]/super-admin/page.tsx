import { setRequestLocale } from "next-intl/server";
import { formatMoney } from "@/lib/cash/dunning";
import { loadMothership } from "@/lib/superadmin/metrics";
import { requireSuperAdminPage } from "@/lib/superadmin/guard";

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="glow-border rounded-2xl p-5">
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);

export default async function MothershipPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdminPage(); // também aqui: os layouts não chegam
  const m = await loadMothership();
  const money = (minor: number) => (m.mrr ? formatMoney(minor, m.mrr.currency) : "—");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR global" value={m.mrr ? money(m.mrr.amountMinor) : "indisponível"} hint={m.mrr ? `Em risco de churn: ${money(m.mrrAtRiskMinor)}` : "O preço do plano não veio do Stripe"} />
        <Stat label="Clientes ativos (a pagar)" value={m.activeClients} hint={`${m.trialing} em teste · ${m.pastDue} em atraso · ${m.orgs} no total`} />
        <Stat label="Churn risk (>7 dias sem login)" value={m.churnRiskTotal} />
        <Stat label="Eventos 24 h" value={`${m.events24h.critical} críticos`} hint={`${m.events24h.warning} avisos · ${m.events24h.info} informativos`} />
      </div>

      <section>
        <h2 className="text-lg font-semibold">Organizações em risco de churn</h2>
        <p className="mt-1 text-xs text-muted">Sem iniciar sessão há mais de 7 dias. A sessão aberta e renovada não conta como login.</p>
        <div className="glow-border mt-3 overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-border text-left text-muted"><th className="px-4 py-3 font-medium">Organização</th><th className="px-4 py-3 font-medium">Dono</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Sem login</th></tr></thead>
            <tbody>
              {m.churnRisk.map((w) => <tr key={w.id} className="border-b border-border/50"><td className="px-4 py-3">{w.name}</td><td className="px-4 py-3 text-muted">{w.ownerEmail ?? "—"}</td><td className="px-4 py-3">{w.subStatus}</td><td className="px-4 py-3">{w.daysSinceLogin === null ? "nunca" : `${w.daysSinceLogin} dias`}</td></tr>)}
              {m.churnRisk.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Nenhuma organização em risco.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Consumo de IA hoje (limite {m.defaultLimit}/dia por organização)</h2>
        <ul className="glow-border mt-3 divide-y divide-border/60 rounded-2xl text-sm">
          {m.aiTopToday.map((u) => <li key={u.workspaceId} className="flex justify-between px-4 py-3"><span>{u.name}</span><span className={u.count > m.defaultLimit ? "font-medium text-danger" : ""}>{u.count}</span></li>)}
          {m.aiTopToday.length === 0 && <li className="px-4 py-6 text-center text-muted">Sem chamadas hoje.</li>}
        </ul>
      </section>
    </div>
  );
}
