import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente do Supabase com a chave "service role": ignora todas as regras de acesso. Só existe no servidor e só
// serve para gerir contas de Auth (apagar o utilizador de quem sai da equipa ou elimina a conta).
const globalForAdmin = globalThis as unknown as { supabaseAuthAdmin?: SupabaseClient };

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return (globalForAdmin.supabaseAuthAdmin ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}

// Apaga contas de Auth. Devolve quantas ficaram por apagar (0 = tudo certo); nunca lança.
export async function deleteAuthUsers(authIds: string[]): Promise<number> {
  const admin = supabaseAdmin();
  if (!admin) return authIds.length;
  let failed = 0;
  for (const id of authIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    // "user not found" conta como feito: o objetivo é a conta não existir.
    if (error && error.status !== 404) {
      failed++;
      console.error("[supabase/admin] não apagou o utilizador de Auth:", error.status, error.message);
    }
  }
  return failed;
}
