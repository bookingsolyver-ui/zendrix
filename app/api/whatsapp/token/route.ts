import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";

const MIN_TOKEN_LENGTH = 20;
const MAX_TOKEN_LENGTH = 2000;

// Replaces the WhatsApp access token of the caller's workspace (e.g. when Meta's 24h test token
// expires). The new token is checked against Meta first and stored encrypted.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 });
  }

  const limit = await rateLimit(`wa-token:${user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH || /\s/.test(token)) {
    return NextResponse.json({ success: false, error: "invalid_format" }, { status: 400 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { workspaceId: true },
    });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "no_workspace" }, { status: 403 });
    }
    if (!(await getAccess(dbUser.workspaceId)).active) return subscriptionRequiredResponse(); // PAYWALL

    const integration = await prisma.socialIntegration.findFirst({
      where: { workspaceId: dbUser.workspaceId, platform: "WHATSAPP" },
      orderBy: { createdAt: "desc" },
      select: { id: true, providerAccountId: true },
    });
    if (!integration?.providerAccountId) {
      return NextResponse.json({ success: false, error: "no_integration" }, { status: 404 });
    }

    // Read-only call: proves the token works for this phone number without sending a message.
    const check = await fetch(
      `https://graph.facebook.com/v17.0/${integration.providerAccountId}?fields=id`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!check.ok) {
      const detail = await check.json().catch(() => null);
      console.error("[whatsapp/token] Meta rejected the new token", check.status, detail?.error?.code);
      return NextResponse.json({ success: false, error: "invalid_token" }, { status: 400 });
    }

    await prisma.socialIntegration.update({
      where: { id: integration.id },
      data: { accessToken: encryptSecret(token), status: "ACTIVE" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[whatsapp/token] update failed", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
