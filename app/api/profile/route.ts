import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const MAX_NAME_LENGTH = 120;

// Updates the signed-in user's display name (database + Supabase Auth metadata).
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ success: false, error: "invalid_name" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.updateMany({ where: { authId: user.id }, data: { name } });
    if (updated.count === 0) {
      return NextResponse.json({ success: false, error: "no_profile" }, { status: 404 });
    }
    await supabase.auth.updateUser({ data: { name } });
    return NextResponse.json({ success: true, name });
  } catch (err) {
    console.error("[profile] update failed", err);
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
