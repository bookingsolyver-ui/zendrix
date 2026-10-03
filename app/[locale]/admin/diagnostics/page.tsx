import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Findings } from "@/components/admin/findings";
import { Section } from "@/components/admin/ui";
import { loadPlatformDiagnostics } from "@/lib/admin/diagnostics";

export default async function AdminDiagnosticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { platform, organizations } = await loadPlatformDiagnostics();

  return (
    <>
      <DashboardPageHeader title="Diagnóstico da plataforma" subtitle="O que está mal no servidor e que organizações precisam de atenção." />

      <Section title="Servidor e workers">
        {platform.length === 0 ? <div className="glow-border rounded-2xl px-6 py-8 text-center text-sm text-emerald-300">A configuração do servidor e os workers estão em ordem.</div> : <Findings findings={platform} />}
      </Section>

      <Section title={`Organizações com problemas (${organizations.length})`}>
        <ul className="glow-border divide-y divide-white/5 rounded-2xl text-sm">
          {organizations.map((org) => (
            <li key={org.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span>
                <Link href={`/admin/organizations/${org.id}/diagnostics`} className="font-medium text-white hover:underline">
                  {org.name}
                </Link>
                <span className="ml-3 text-xs text-white/50">{org.problems.join(" · ")}</span>
              </span>
              <Link href={`/admin/organizations/${org.id}/diagnostics`} className="text-xs text-emerald-300 hover:underline">
                Ver diagnóstico
              </Link>
            </li>
          ))}
          {organizations.length === 0 && <li className="px-5 py-8 text-center text-white/40">Nenhuma organização com problemas conhecidos.</li>}
        </ul>
        <p className="mt-3 text-xs text-white/40">Esta lista mostra falhas de envio nas últimas 24 h, canais com o token recusado, pagamentos em atraso e contas por aprovar. Abra o diagnóstico de uma organização para o detalhe e os passos a seguir.</p>
      </Section>
    </>
  );
}
