import { setRequestLocale } from "next-intl/server";
import { TenantControls } from "@/components/superadmin/tenant-controls";
import { prisma } from "@/lib/prisma";
import { FEATURE_FLAGS } from "@/lib/superadmin/catalog";
import { requireSuperAdminPage } from "@/lib/superadmin/guard";
import { loadTenants } from "@/lib/superadmin/metrics";

export default async function TenantsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdminPage();
  const { q } = await searchParams;
  const tenants = await loadTenants(q?.trim().slice(0, 80) || undefined);
  const overridden = new Set((await prisma.zetrixAdmin_QuotaOverride.findMany({ where: { workspaceId: { in: tenants.map((t) => t.id) }, metric: "ai_calls" }, select: { workspaceId: true } })).map((o) => o.workspaceId));
  const catalog = FEATURE_FLAGS.map((f) => ({ id: f.id, label: f.label }));

  return (
    <div className="space-y-6">
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Nome, e-mail do dono ou id..." className="w-full max-w-sm rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" /><button className="rounded-lg border border-border px-4 text-sm">Procurar</button></form>
      <p className="text-xs text-muted">Desligar uma funcionalidade vale na chamada seguinte. Para suspender TUDO (incluindo o login), use a suspensão no Admin clássico.</p>
      {tenants.map((t) => (
        <details key={t.id} className="glow-border rounded-2xl">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
            <span className="font-medium">{t.name} <span className="font-normal text-muted">· {t.ownerEmail ?? "sem dono"} · {t.id}</span></span>
            <span className="text-xs text-muted">{t.blocked ? "SUSPENSA · " : ""}{t.subStatus} · IA hoje {t.aiToday}/{t.aiLimit} · {t.daysSinceLogin === null ? "nunca entrou" : `login há ${t.daysSinceLogin} d`}{t.flags.some((f) => !f.enabled) ? " · ⚠ flags desligadas" : ""}</span>
          </summary>
          <TenantControls workspaceId={t.id} catalog={catalog} flags={t.flags} aiLimit={t.aiLimit} hasOverride={overridden.has(t.id)} />
        </details>
      ))}
      {tenants.length === 0 && <p className="text-sm text-muted">Nenhuma organização encontrada.</p>}
    </div>
  );
}
