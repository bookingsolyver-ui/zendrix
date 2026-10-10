import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { AdminHeader } from "@/components/admin/admin-header";
import { requirePlatformAdminPage } from "@/lib/admin/guard";
import { countPendingApprovals } from "@/lib/admin/queries";

// A área do administrador da PLATAFORMA. Quem não for administrador vê um 404 (nem se revela que a área existe), e
// nunca é indexada por motores de pesquisa.
// Nunca se pré-renderiza: depende da sessão de quem pede.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Administração · Kwanza Flow", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/organizations", label: "Organizações" },
  { href: "/admin/approvals", label: "Aprovações" },
  { href: "/admin/calendar", label: "Calendário" },
  { href: "/admin/billing", label: "Subscrições" },
  { href: "/admin/diagnostics", label: "Diagnóstico" },
  { href: "/admin/notices", label: "Avisos" },
  { href: "/admin/audit", label: "Auditoria" },
] as const;

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requirePlatformAdminPage();
  const pending = await countPendingApprovals();

  const items = NAV.map((item) => ({ ...item, badge: item.href === "/admin/approvals" ? pending : 0 }));

  return (
    <div className="min-h-screen">
      <AdminHeader items={items} email={admin.email} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
