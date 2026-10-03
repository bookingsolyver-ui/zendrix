import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ApprovalActions } from "@/components/admin/approval-actions";
import { Pill, Section, dateTime } from "@/components/admin/ui";
import { loadApprovals } from "@/lib/admin/queries";

export default async function AdminApprovalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { pending, decided } = await loadApprovals();

  return (
    <>
      <DashboardPageHeader title="Aprovação de contas" subtitle="As contas novas só entram na plataforma depois de aprovadas aqui." />

      {pending.length === 0 ? (
        <div className="glow-border rounded-2xl px-6 py-12 text-center text-sm text-white/50">Nenhuma conta a aguardar aprovação.</div>
      ) : (
        <div className="space-y-4">
          {pending.map((org) => (
            <article key={org.id} className="glow-border rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/organizations/${org.id}`} className="text-base font-semibold text-white hover:underline">
                    {org.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-white/60">{org.ownerEmail ?? org.users[0]?.email ?? "sem e-mail"}</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    Registada a {dateTime.format(org.createdAt)}
                    {org.users[0]?.name ? ` · ${org.users[0].name}` : ""}
                  </p>
                </div>
                <Pill tone="warn">Por aprovar</Pill>
              </div>
              <div className="mt-4">
                <ApprovalActions id={org.id} name={org.name} hasEmail={Boolean(org.ownerEmail ?? org.users[0]?.email)} />
              </div>
            </article>
          ))}
        </div>
      )}

      <Section title="Decisões recentes">
        <ul className="glow-border divide-y divide-white/5 rounded-2xl text-sm">
          {decided.map((org) => (
            <li key={org.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span>
                <Link href={`/admin/organizations/${org.id}`} className="font-medium text-white hover:underline">
                  {org.name}
                </Link>
                <span className="ml-2 text-white/40">{org.ownerEmail ?? ""}</span>
                {org.approvalNote && <span className="ml-2 text-xs text-white/40">· {org.approvalNote}</span>}
              </span>
              <span className="flex items-center gap-3">
                <Pill tone={org.approvalStatus === "APPROVED" ? "good" : "bad"}>{org.approvalStatus === "APPROVED" ? "Aprovada" : "Rejeitada"}</Pill>
                <span className="text-xs text-white/40">{org.approvalDecidedAt ? dateTime.format(org.approvalDecidedAt) : ""}</span>
              </span>
            </li>
          ))}
          {decided.length === 0 && <li className="px-5 py-6 text-center text-white/40">Ainda não houve decisões.</li>}
        </ul>
      </Section>
    </>
  );
}
