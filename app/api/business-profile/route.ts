import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
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

export async function PUT(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!me.workspace) return NextResponse.json({ error: "no_workspace" }, { status: 403 });

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
