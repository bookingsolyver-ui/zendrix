import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Pill, TABLE, TD, TH, dateOnly, subTone } from "@/components/admin/ui";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { listOrganizations } from "@/lib/admin/queries";
import { ORG_FILTERS, SUB_STATUS_LABEL, parseOrgListQuery } from "@/lib/admin/schema";

const FILTER_LABEL: Record<(typeof ORG_FILTERS)[number], string> = { all: "Todas", active: "Ativas", trialing: "Em teste", past_due: "Em atraso", canceled: "Canceladas", blocked: "Suspensas" };

export default async function AdminOrganizationsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseOrgListQuery(await searchParams);
  const { rows, total, pages } = await listOrganizations(query);
  const link = (page: number) => `/admin/organizations?page=${page}&status=${query.status}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`;

  return (
    <>
      <DashboardPageHeader title="Organizações" subtitle={`${total.toLocaleString("pt-PT")} empresas registadas.`} />

      <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
        <input name="q" defaultValue={query.q} placeholder="Pesquisar por nome, e-mail do dono ou id" aria-label="Pesquisar" className={`${INPUT} w-full max-w-sm`} />
        <select name="status" defaultValue={query.status} aria-label="Estado" className={`${INPUT} bg-[#111]`}>
          {ORG_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {FILTER_LABEL[filter]}
            </option>
          ))}
        </select>
        <button type="submit" className={BTN_PRIMARY}>
          Filtrar
        </button>
      </form>

      <div className="glow-border overflow-x-auto rounded-2xl">
        <table className={TABLE}>
          <thead>
            <tr className="border-b border-white/10">
              <th className={TH}>Organização</th>
              <th className={TH}>Criada</th>
              <th className={TH}>Plano</th>
              <th className={TH}>Estado</th>
              <th className={`${TH} text-right`}>Utilizadores</th>
              <th className={`${TH} text-right`}>Contactos</th>
              <th className={`${TH} text-right`}>Msgs 30 d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]">
                <td className={TD}>
                  <Link href={`/admin/organizations/${row.id}`} className="font-medium text-white hover:underline">
                    {row.name}
                  </Link>
                  <p className="text-xs text-white/40">{row.ownerEmail ?? "—"}</p>
                </td>
                <td className={`${TD} text-white/60`}>{dateOnly.format(row.createdAt)}</td>
                <td className={`${TD} text-white/60`}>{row.plan ?? "—"}</td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone={subTone(row.subStatus)}>{SUB_STATUS_LABEL[row.subStatus] ?? row.subStatus}</Pill>
                    {row.blockedAt && <Pill tone="bad">Suspensa</Pill>}
                  </div>
                </td>
                <td className={`${TD} text-right`}>{row.users}</td>
                <td className={`${TD} text-right`}>{row.contacts.toLocaleString("pt-PT")}</td>
                <td className={`${TD} text-right`}>{row.messages30d.toLocaleString("pt-PT")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                  Nenhuma organização encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/50">
          <span>
            Página {query.page} de {pages}
          </span>
          <div className="flex gap-2">
            {query.page > 1 && (
              <Link href={link(query.page - 1)} className={BTN_GHOST}>
                Anterior
              </Link>
            )}
            {query.page < pages && (
              <Link href={link(query.page + 1)} className={BTN_GHOST}>
                Seguinte
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
