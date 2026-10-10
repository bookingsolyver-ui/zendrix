import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { deauthorizeConnectAccount } from "@/lib/stripe/connect";

// Desligar o Stripe: a IA deixa de poder enviar links de pagamento e a Kwanza Flow perde o acesso à conta da empresa.
// Os links já enviados continuam a funcionar (estão na conta Stripe dela). Não depende do plano: desligar é sempre permitido.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const workspace = await prisma.workspace.findUnique({ where: { id: who.workspaceId }, select: { stripeConnectAccountId: true } });
    if (!workspace?.stripeConnectAccountId) return NextResponse.json({ success: true });
    const revoked = await deauthorizeConnectAccount(workspace.stripeConnectAccountId);
    await prisma.workspace.update({ where: { id: who.workspaceId }, data: { stripeConnectAccountId: null } });
    return NextResponse.json({ success: true, revoked });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[stripe/connect/disconnect] falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
