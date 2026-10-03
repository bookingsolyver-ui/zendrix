import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/auth/provision";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HOUR_MS = 60 * 60 * 1000;
const MAX_SIGNUPS_PER_IP = 5;
const MAX_SIGNUPS_PER_EMAIL = 3;

function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: Request) {
  // Per-IP cap first, before doing any work, to stop mass account creation.
  const ipLimit = await rateLimit(`register:ip:${getClientIp(request)}`, {
    limit: MAX_SIGNUPS_PER_IP,
    windowMs: HOUR_MS,
    failClosed: true,
  });
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const workspaceName = typeof body?.workspaceName === "string" ? body.workspaceName.trim() : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ success: false, error: "invalid_email" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ success: false, error: "weak_password" }, { status: 400 });
  }
  if (name.length > 120 || workspaceName.length > 120) {
    return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
  }

  // Per-address cap: stops someone using us to flood one inbox with confirmation emails.
  const emailLimit = await rateLimit(`register:email:${email.toLowerCase()}`, {
    limit: MAX_SIGNUPS_PER_EMAIL,
    windowMs: HOUR_MS,
    failClosed: true,
  });
  if (!emailLimit.ok) return tooManyRequests(emailLimit.retryAfterSeconds);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      // Where the confirmation link in the email lands (must be in Supabase's redirect allow-list).
      emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("[auth/register] supabase signUp failed", error.status, error.code, error.message);
    // Supabase throttles confirmation emails per address (~60s); tell the user to wait, not "failed".
    if (error.status === 429) return tooManyRequests(60);
    return NextResponse.json({ success: false, error: "signup_failed" }, { status: 400 });
  }

  // With email confirmation on, Supabase returns an obfuscated user with no identities
  // when the address is already registered.
  if (!data.user || data.user.identities?.length === 0) {
    return NextResponse.json({ success: false, error: "email_exists" }, { status: 409 });
  }

  try {
    await provisionUser({
      authId: data.user.id,
      email,
      emailVerified: Boolean(data.user.email_confirmed_at),
      name,
      workspaceName,
    });
  } catch (err) {
    // The Supabase account exists; /api/auth/provision retries this on first login.
    console.error("[auth/register] provisioning failed", err);
    return NextResponse.json({ success: false, error: "provision_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, needsConfirmation: !data.session });
}
