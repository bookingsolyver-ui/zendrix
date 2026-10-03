"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Menu, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";

export interface AdminNavItem {
  href: string;
  label: string;
  // Número a mostrar ao lado (por exemplo, contas por aprovar). 0 = nada.
  badge?: number;
}

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

// O cabeçalho do painel de administração: logótipo com um selo discreto «Admin», navegação com a página ativa
// destacada, e à direita a conta, «Voltar ao painel» e «Sair». Em ecrãs pequenos, a navegação passa para um menu.
// Só recebe texto e números do servidor (nunca funções nem ícones).
export function AdminHeader({ items, email }: { items: AdminNavItem[]; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  // O menu guarda em que página foi aberto: ao mudar de página deixa de contar como aberto (fecha sozinho).
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const open = openAt === pathname;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => setOpenAt((current) => ((typeof value === "function" ? value(current === pathname) : value) ? pathname : null));

  // Esc fecha o menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function logout() {
    setLeaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const navLink = (item: AdminNavItem, mobile: boolean) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors ${mobile ? "px-3 py-3" : "px-3 py-2"} ${active ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}
      >
        {item.label}
        {item.badge ? <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-300">{item.badge}</span> : null}
        {active && !mobile && <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-emerald-400" />}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <Logo size="sm" href="/admin" />
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Admin</span>
        </div>

        <nav aria-label="Administração" className="mx-auto hidden min-w-0 items-center gap-0.5 xl:flex">
          {items.map((item) => navLink(item, false))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex 2xl:pr-3" title={email}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">{initial}</span>
            <span className="hidden max-w-[10rem] truncate text-xs text-white/60 2xl:inline">{email}</span>
          </div>
          <Link href="/dashboard" className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white sm:flex">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao painel
          </Link>
          <button type="button" onClick={() => void logout()} disabled={leaving} className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60 sm:flex">
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="admin-mobile-menu" aria-label={open ? "Fechar menu" : "Abrir menu"} className="rounded-lg p-2 text-white/70 hover:bg-white/5 hover:text-white xl:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="admin-mobile-menu" className="border-t border-white/10 bg-black/90 px-4 pb-4 pt-2 xl:hidden">
          <nav aria-label="Administração (menu)" className="flex flex-col">
            {items.map((item) => navLink(item, true))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">{initial}</span>
              <span className="truncate text-xs text-white/60">{email}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/dashboard" className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80">
                <ArrowLeft className="h-3.5 w-3.5" />
                Painel
              </Link>
              <button type="button" onClick={() => void logout()} disabled={leaving} className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 disabled:opacity-60">
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
