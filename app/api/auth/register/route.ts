import { NextResponse } from "next/server";
import { signUpUser } from "@/lib/auth/signup";
import { appOrigin } from "@/lib/http/origin";
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

  const origin = appOrigin(request);
  const signup = await signUpUser({ email, password, name, origin, locale: typeof body?.locale === "string" ? body.locale : undefined });
  if (!signup.ok) {
    // Supabase throttles confirmation emails per address (~60s); tell the user to wait, not "failed".
    if (signup.error === "rate_limited") return tooManyRequests(60);
    if (signup.error === "email_exists") return NextResponse.json({ success: false, error: "email_exists" }, { status: 409 });
    if (signup.error === "weak_password") return NextResponse.json({ success: false, error: "weak_password" }, { status: 400 });
    return NextResponse.json({ success: false, error: "signup_failed" }, { status: 400 });
  }

  try {
    await provisionUser({
      authId: signup.userId,
      email,
      emailVerified: signup.emailVerified,
      name,
      workspaceName,
    });
  } catch (err) {
    // The Supabase account exists; /api/auth/provision retries this on first login.
    console.error("[auth/register] provisioning failed", err);
    return NextResponse.json({ success: false, error: "provision_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, needsConfirmation: !signup.hasSession });
}
