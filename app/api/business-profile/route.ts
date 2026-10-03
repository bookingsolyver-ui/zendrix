import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { loadBusinessState } from "@/lib/agent/business";
import { compileKnowledge, hasMinimumProfile, parseProfile } from "@/lib/agent/profile";

const MAX_BODY_BYTES = 200_000;

// Ficha do negócio da organização de quem pede. A organização vem SEMPRE da sessão, nunca do pedido:
// não há forma de ler ou escrever a ficha de outra organização.

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!me.workspace) return NextResponse.json({ error: "no_workspace" }, { status: 403 });

  const state = await loadBusinessState(me.workspace.id);
  if (!state) return NextResponse.json({ error: "no_workspace" }, { status: 403 });
  return NextResponse.json(state);
}

// Editar a ficha (e ligar/desligar a IA) muda o que o assistente diz aos clientes: só OWNER e MANAGER.
export async function PUT(request: Request) {
  let workspaceId: string;
  let rateKey: string;
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    workspaceId = who.workspaceId;
    rateKey = who.rateKey;
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
  const me = { workspace: { id: workspaceId }, authId: rateKey };

  const limit = await rateLimit(`business-profile:${me.authId}`, { limit: 30, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const body = await request.json().catch(() => null);

  const parsed = parseProfile(body?.profile);
  if (!parsed.ok) return NextResponse.json({ error: "invalid", errors: parsed.errors }, { status: 400 });
  const { profile } = parsed;

  const agentEnabled = typeof body?.agentEnabled === "boolean" ? body.agentEnabled : undefined;
  if (agentEnabled === true && !hasMinimumProfile(profile)) {
    return NextResponse.json(
      { error: "profile_incomplete", errors: { _: "Preencha o nome comercial e a descrição antes de ligar o agente." } },
      { status: 400 }
    );
  }

  const compiled = compileKnowledge(profile);
  try {
    await prisma.workspace.update({
      where: { id: me.workspace.id },
      data: {
        agentProfile: profile as unknown as object,
        // Sem conteúdo, sem ficha: o agente cala-se em vez de inventar.
        agentKnowledge: compiled || null,
        ...(agentEnabled !== undefined ? { agentEnabled } : {}),
      },
    });
    const state = await loadBusinessState(me.workspace.id);
    return NextResponse.json({ success: true, ...state });
  } catch (err) {
    console.error("[business-profile] save failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PATCH { agentEnabled: boolean }: liga ou desliga a IA sem mexer na ficha (é o botão "Ligar a IA" do onboarding).
// Ligar exige plano ativo e a ficha mínima preenchida: sem ela o agente inventava.
export async function PATCH(request: Request) {
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const body = await request.json().catch(() => null);
    if (typeof body?.agentEnabled !== "boolean") return NextResponse.json({ error: "invalid" }, { status: 400 });

    if (body.agentEnabled) {
      if (!(await getAccess(who.workspaceId)).active) return subscriptionRequiredResponse();
      const state = await loadBusinessState(who.workspaceId);
      if (!state || !hasMinimumProfile(state.profile) || !state.compiled.trim()) {
        return NextResponse.json({ error: "profile_incomplete" }, { status: 400 });
      }
    }
    await prisma.workspace.update({ where: { id: who.workspaceId }, data: { agentEnabled: body.agentEnabled } });
    return NextResponse.json({ success: true, agentEnabled: body.agentEnabled });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[business-profile] toggle failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
