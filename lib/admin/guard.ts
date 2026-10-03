import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// O controlo de acesso do painel de administração da PLATAFORMA. É independente dos papéis das organizações
// (Proprietário, Gestor, Agente): ser proprietário de uma organização não dá acesso a nada aqui.
//
//  * a identidade vem da sessão do Supabase (verificada no servidor), nunca de um cookie ou de um parâmetro;
//  * o privilégio vem da coluna User.isPlatformAdmin, que só se altera por script no servidor
//    (scripts/make-platform-admin.mjs): não há rota, formulário nem convite que a escreva;
//  * quem não é administrador recebe 404, igual ao de uma página que não existe: nem se revela que a área existe;
//  * o painel não depende do plano nem do estado da organização do administrador.

export interface PlatformAdmin {
  userId: string;
  email: string;
}

export const getPlatformAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  // Fora do try: o Next sinaliza "esta página é dinâmica" (cookies) lançando um erro que tem de chegar até ele.
  const supabase = await createClient();
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const user = await prisma.user.findUnique({ where: { authId: data.user.id }, select: { id: true, email: true, isPlatformAdmin: true } });
    return user?.isPlatformAdmin ? { userId: user.id, email: user.email } : null;
  } catch (err) {
    console.error("[admin] verificação falhou (negado)", err);
    return null; // falha fechada: na dúvida, ninguém entra
  }
});

// Páginas: administrador ou 404.
export async function requirePlatformAdminPage(): Promise<PlatformAdmin> {
  const admin = await getPlatformAdmin();
  if (!admin) notFound();
  return admin;
}

const notFoundJson = () => NextResponse.json({ success: false, error: "not_found" }, { status: 404 });

// Rotas de API: administrador (senão 404) e mesma origem (senão 403), e erros tratados de forma uniforme.
export async function adminGuarded(request: Request, label: string, handler: (admin: PlatformAdmin) => Promise<NextResponse>): Promise<NextResponse> {
  const admin = await getPlatformAdmin();
  if (!admin) return notFoundJson();
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    return await handler(admin);
  } catch (err) {
    console.error(`[api/admin/${label}] falhou`, err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}

// Fica registado quem fez o quê, a quem e quando (e antes/depois). Nunca guarda segredos nem dados de clientes.
export async function logAdminAction(admin: PlatformAdmin, action: string, workspaceId: string | null, details?: Prisma.InputJsonValue) {
  await prisma.adminAuditLog.create({ data: { adminId: admin.userId, adminEmail: admin.email, workspaceId, action, ...(details !== undefined ? { details } : {}) } });
}

// Ver os dados de uma organização é um acesso de suporte: fica registado, no máximo uma vez a cada 10 minutos.
export async function logOrganizationView(admin: PlatformAdmin, workspaceId: string) {
  const recent = await prisma.adminAuditLog.count({ where: { adminId: admin.userId, workspaceId, action: "view_organization", createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
  if (recent === 0) await logAdminAction(admin, "view_organization", workspaceId);
}
