import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { requireSuperAdminPage } from "@/lib/superadmin/guard";

// A Nave-Mãe: só o fundador/CTO (SUPER_ADMIN_EMAILS + administrador da plataforma). Todos os outros veem 404. Nunca indexada.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nave-Mãe · Kwanza Flow", robots: { index: false, follow: false } };

const NAV = [
  { href: "super-admin", label: "Visão global" },
  { href: "super-admin/tenants", label: "Organizações e flags" },
  { href: "super-admin/events", label: "Erros e alertas" },
] as const;

export default async function SuperAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requireSuperAdminPage();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap gap-4 text-sm">
            <span className="font-semibold">Nave-Mãe</span>
            {NAV.map((item) => <Link key={item.href} href={`/${locale}/${item.href}`} className="text-muted hover:text-foreground">{item.label}</Link>)}
            <Link href={`/${locale}/admin`} className="text-muted hover:text-foreground">Admin clássico</Link>
          </nav>
          <span className="text-xs text-muted">{admin.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
