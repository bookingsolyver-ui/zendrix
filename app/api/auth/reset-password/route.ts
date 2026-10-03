import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ password: z.string().min(8).max(128) });

// Define a nova palavra-passe. Só com a sessão de recuperação (a que o link do e-mail abriu) ou com uma sessão normal.
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ success: false, error: "weak_password" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "session_expired" }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password: body.data.password });
  if (error) {
    console.error("[auth/reset-password] updateUser falhou", error.status, error.code);
    return NextResponse.json(
      { success: false, error: error.code === "weak_password" ? "weak_password" : "update_failed" },
      { status: 400 },
    );
  }
  // A palavra-passe mudou: as outras sessões abertas (de quem a tivesse roubado) deixam de valer.
  await supabase.auth.signOut({ scope: "others" }).catch(() => {});
  return NextResponse.json({ success: true });
}
