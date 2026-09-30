import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export async function POST() {
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

    // 3. Read the WhatsApp credentials that belong to that workspace only.
    const integration = await prisma.socialIntegration.findFirst({
      where: { workspaceId: dbUser.workspaceId, platform: "WHATSAPP", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { accessToken: true, providerAccountId: true },
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

    const res = await fetch(
      `https://graph.facebook.com/v17.0/${integration.providerAccountId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "351932793264",
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } },
        }),
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
      return NextResponse.json({ success: false, error: "token_expired" }, { status: 502 });
    }
    return NextResponse.json({ success: false, error }, { status: res.status });
  } catch (err) {
    console.error("[whatsapp/connect] request failed", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 502 });
  }
}
