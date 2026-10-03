import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Findings } from "@/components/admin/findings";
import { diagnoseOrganization } from "@/lib/admin/diagnostics";
import { getPlatformAdmin, logAdminAction } from "@/lib/admin/guard";
import { idSchema } from "@/lib/validations/team";

export default async function AdminOrganizationDiagnosticsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!idSchema.safeParse(id).success) notFound();
  const result = await diagnoseOrganization(id);
  if (!result) notFound();
  const admin = await getPlatformAdmin();
  if (admin) await logAdminAction(admin, "view_diagnostics", id);

  const critical = result.findings.filter((finding) => finding.severity === "critical").length;
  const warnings = result.findings.filter((finding) => finding.severity === "warning").length;

  return (
    <>
      <DashboardPageHeader title={`Diagnóstico: ${result.name}`} subtitle={critical + warnings === 0 ? "Nenhum problema grave detetado." : `${critical} crítico(s) e ${warnings} aviso(s). Os mais graves vêm primeiro.`} />
      <p className="mb-6 flex gap-4 text-sm">
        <Link href={`/admin/organizations/${id}`} className="text-white/60 hover:text-white">
          ← Voltar à organização
        </Link>
        <Link href="/admin/diagnostics" className="text-white/60 hover:text-white">
          Diagnóstico da plataforma
        </Link>
      </p>
      <Findings findings={result.findings} />
      <p className="mt-6 text-xs text-white/40">O diagnóstico cruza a subscrição, os canais, a fila de envio, as campanhas, as automações, os limites do plano e a configuração do servidor. Os dados são os das últimas 24 horas (7 dias nas campanhas).</p>
    </>
  );
}
