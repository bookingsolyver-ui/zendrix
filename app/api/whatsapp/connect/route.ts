import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { requireRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { GRAPH_BASE } from "@/lib/meta/send";
import { markIntegrationExpired } from "@/lib/meta/integration-health";

export async function POST() {
  // Credenciais do canal: só OWNER e MANAGER (um Agente não troca o token da empresa).
  try {
    await requireRole(["OWNER", "MANAGER"]);
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }

  // 1. Require an authenticated session (validated against Supabase, not just the cookie).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    // 2. Resolve the caller's workspace from our own User table.
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { workspaceId: true },
    });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "no_workspace" }, { status: 403 });
    }

    if (!(await getAccess(dbUser.workspaceId)).active) return subscriptionRequiredResponse(); // PAYWALL

    // 3. Read the WhatsApp credentials that belong to that workspace only.
    const integration = await prisma.socialIntegration.findFirst({
      where: { workspaceId: dbUser.workspaceId, platform: "WHATSAPP", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, accessToken: true, providerAccountId: true },
    });
    if (!integration?.providerAccountId) {
      return NextResponse.json({ success: false, error: "no_integration" }, { status: 404 });
    }

    // The token is stored encrypted; it only exists in plain text here, in memory.
    let accessToken: string;
    try {
      accessToken = decryptSecret(integration.accessToken);
    } catch (err) {
      console.error("[whatsapp/connect] could not decrypt integration token", err);
      return NextResponse.json({ success: false, error: "integration_unreadable" }, { status: 500 });
    }

    // Teste de ligação SÓ DE LEITURA: pergunta à Meta pelo próprio número. Prova que o token e o Phone ID
    // funcionam sem enviar nenhuma mensagem (antes enviava um template a um número fixo, de cada vez).
    const res = await fetch(
      `${GRAPH_BASE}/${integration.providerAccountId}?fields=id,display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (res.ok) {
      return NextResponse.json({ success: true });
    }

    const error = await res.json().catch(() => ({ message: res.statusText }));
    console.error("[whatsapp/connect] Meta API error", res.status, error);
    // Meta code 190 = invalid/expired access token. Report it distinctly (and not as a 401,
    // which the client would confuse with "not signed in").
    if (res.status === 401 || error?.error?.code === 190) {
      await markIntegrationExpired(integration.id);
      return NextResponse.json({ success: false, error: "token_expired" }, { status: 502 });
    }
    return NextResponse.json({ success: false, error }, { status: res.status });
  } catch (err) {
    console.error("[whatsapp/connect] request failed", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 502 });
  }
}
