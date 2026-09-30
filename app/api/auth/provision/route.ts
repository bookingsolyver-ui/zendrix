import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { provisionUser } from "@/lib/auth/provision";

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
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/provision] failed", err);
    return NextResponse.json({ success: false, error: "provision_failed" }, { status: 500 });
  }
}
