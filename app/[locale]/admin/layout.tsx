import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { requirePlatformAdminPage } from "@/lib/admin/guard";

// A área do administrador da PLATAFORMA. Quem não for administrador vê um 404 (nem se revela que a área existe), e
// nunca é indexada por motores de pesquisa.
// Nunca se pré-renderiza: depende da sessão de quem pede.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Administração · Zentrix", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/organizations", label: "Organizações" },
  { href: "/admin/billing", label: "Subscrições e pagamentos" },
  { href: "/admin/audit", label: "Auditoria" },
] as const;

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await requirePlatformAdminPage();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Logo />
          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">Administração da plataforma</span>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Administração">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-xs text-white/40">
            <span>{admin.email}</span>
            <Link href="/dashboard" className="text-white/60 hover:text-white">
              Voltar ao painel
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
