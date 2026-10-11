import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/auth/provision";
import { restrictionOf } from "@/lib/billing/policy";
import { prisma } from "@/lib/prisma";

// Called after login: makes sure the signed-in Supabase user has a User row and Workspace.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
    await provisionUser({
      authId: user.id,
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
      name,
    });
    // O estado da organização lido AGORA da base de dados (nunca de uma sessão antiga): o ecrã de login usa-o para
    // levar a pessoa ao sítio certo (painel, ou a página de espera de aprovação).
    const row = await prisma.user.findUnique({ where: { authId: user.id }, select: { workspace: { select: { approvalStatus: true, blockedAt: true } } } });
    return NextResponse.json({ success: true, restriction: row ? restrictionOf(row.workspace) : null });
  } catch (err) {
    console.error("[auth/provision] failed", err);
    return NextResponse.json({ success: false, error: "provision_failed" }, { status: 500 });
  }
}
