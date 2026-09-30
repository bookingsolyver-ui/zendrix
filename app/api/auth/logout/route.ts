import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ends the Supabase session; @supabase/ssr clears the auth cookies on this response.
export async function POST() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[auth/logout] signOut failed", error.status, error.message);
    return NextResponse.json({ success: false, error: "logout_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
