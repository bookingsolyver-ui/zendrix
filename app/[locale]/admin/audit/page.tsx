import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { TABLE, TD, TH, dateTime } from "@/components/admin/ui";
import { loadAudit } from "@/lib/admin/queries";

const ACTION_LABEL: Record<string, string> = { view_organization: "Abriu a organização", block: "Bloqueou", unblock: "Desbloqueou", set_subscription: "Alterou a subscrição", extend_trial: "Prolongou o teste" };

export default async function AdminAuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const entries = await loadAudit(150);

  return (
    <>
      <DashboardPageHeader title="Auditoria" subtitle="Tudo o que os administradores da plataforma fizeram, e quando abriram os dados de uma organização." />
      <div className="glow-border overflow-x-auto rounded-2xl">
        <table className={TABLE}>
          <thead>
            <tr className="border-b border-white/10">
              <th className={TH}>Quando</th>
              <th className={TH}>Administrador</th>
              <th className={TH}>Ação</th>
              <th className={TH}>Organização</th>
              <th className={TH}>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-white/5 align-top last:border-b-0">
                <td className={`${TD} whitespace-nowrap text-white/60`}>{dateTime.format(entry.createdAt)}</td>
                <td className={TD}>{entry.adminEmail}</td>
                <td className={TD}>{ACTION_LABEL[entry.action] ?? entry.action}</td>
                <td className={TD}>
                  {entry.workspaceId ? (
                    <Link href={`/admin/organizations/${entry.workspaceId}`} className="font-mono text-xs hover:underline">
                      {entry.workspaceId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${TD} max-w-md break-words font-mono text-[11px] text-white/40`}>{entry.details ? JSON.stringify(entry.details) : ""}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/40">
                  Sem registos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
