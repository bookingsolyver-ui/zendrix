import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { evaluateAccess, type Access } from "@/lib/billing/policy";
import { prisma } from "@/lib/prisma";

// Aplicação do paywall no servidor. A regra está em policy.ts; aqui lê-se o estado ATUAL da organização
// (sempre da base de dados, nunca de um cookie ou do cliente) e decide-se o que fazer.

// Estado de uma organização, em cache só durante UM pedido.
export const getAccess = cache(async (workspaceId: string): Promise<Access> => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { subStatus: true, trialEndsAt: true },
  });
  // Organização que não existe: nada a que dar acesso.
  if (!workspace) return { active: false, reason: "canceled" };
  return evaluateAccess(workspace.subStatus, workspace.trialEndsAt);
});

// Resposta das rotas de API para quem não tem plano ativo. 402 = Payment Required.
export const subscriptionRequiredResponse = () =>
  NextResponse.json({ success: false, error: "subscription_required" }, { status: 402 });

// Páginas: sem plano ativo, vai para a faturação (sempre aberta) com o motivo. Sem sessão não faz nada (o
// proxy.ts já manda para o login) e sem organização também não (não há plano a avaliar).
export async function requireActivePlanForPage(locale: string) {
  const user = await getCurrentUser();
  if (!user?.workspace) return;
  const access = evaluateAccess(
    user.workspace.subStatus,
    user.workspace.trialEndsAt ? new Date(user.workspace.trialEndsAt) : null,
  );
  if (!access.active) redirect(`/${locale}/dashboard/settings/billing?paywall=${access.reason}`);
}
