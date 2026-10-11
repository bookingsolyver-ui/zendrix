import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Marca o e-mail como confirmado no Supabase Auth (API de administração, com a service role). É a ÚNICA forma
// fiável de o fazer sem depender de um e-mail que pode não chegar (Resend por verificar, limite do Supabase).
// Devolve quantas contas ficaram confirmadas; nunca lança.
export async function confirmAuthEmails(authIds: string[]): Promise<number> {
  const admin = supabaseAdmin();
  if (!admin) {
    console.error("[auth/confirm-email] falta SUPABASE_SERVICE_ROLE_KEY");
    return 0;
  }
  let confirmed = 0;
  for (const id of authIds) {
    try {
      const { error } = await admin.auth.admin.updateUserById(id, { email_confirm: true });
      if (error) console.error("[auth/confirm-email] falhou", error.status, error.code);
      else confirmed++;
    } catch (err) {
      console.error("[auth/confirm-email] erro", err instanceof Error ? err.name : "unknown");
    }
  }
  return confirmed;
}
