import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getPlatformAdmin, type PlatformAdmin } from "@/lib/admin/guard";
import { isSameOrigin } from "@/lib/http/origin";

// O acesso à Nave-Mãe (/super-admin). DUAS chaves, ambas obrigatórias:
//   1. ser administrador da plataforma (User.isPlatformAdmin, só se concede por script no servidor), e
//   2. o e-mail estar em SUPER_ADMIN_EMAILS (lista separada por vírgulas: fundador/CTO).
// Sem a variável, ninguém entra (falha fechada). Quem não passa recebe 404, como no /admin: nem se revela que existe.
// Reutiliza o getPlatformAdmin() do painel existente: a sessão do Supabase é verificada no servidor, nunca num cookie.

export const superAdminEmails = (): string[] => (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const getSuperAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  const admin = await getPlatformAdmin();
  return admin && superAdminEmails().includes(admin.email.toLowerCase()) ? admin : null;
});

// Páginas: chamar no layout E em cada página (os layouts não voltam a correr na navegação do lado do cliente).
export async function requireSuperAdminPage(): Promise<PlatformAdmin> {
  const admin = await getSuperAdmin();
  if (!admin) notFound();
  return admin;
}

export async function superAdminGuarded(request: Request, label: string, handler: (admin: PlatformAdmin) => Promise<NextResponse>): Promise<NextResponse> {
  const admin = await getSuperAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    return await handler(admin);
  } catch (err) {
    console.error(`[api/super-admin/${label}] falhou`, err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
